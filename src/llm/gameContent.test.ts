import { describe, expect, test } from 'vitest';
import {
  parseNovelBlueprint,
  parseTemporaryQuote,
} from './gameContent';

const expectedNodes = [
  { id: 'maze-1-start', type: 'safehouse' as const },
  { id: 'maze-1-combat', type: 'combat' as const },
  { id: 'maze-1-shop', type: 'shop' as const },
  { id: 'maze-1-wonder', type: 'encounter' as const },
  { id: 'maze-1-unknown', type: 'unknown' as const },
  { id: 'maze-1-core', type: 'boss' as const },
];

describe('LLM temporary quote contract', () => {
  test('accepts a concise Rosmontis first-person line', () => {
    expect(parseTemporaryQuote({ text: '我记得这段雨声。' })).toEqual({ text: '我记得这段雨声。' });
  });

  test('rejects quotes over 30 characters or outside first person', () => {
    expect(() => parseTemporaryQuote({ text: '我会记住这段超过三十个字符而且不应该进入界面的临时台词内容直到它结束。' })).toThrow(/30/);
    expect(() => parseTemporaryQuote({ text: '迷迭香会继续前进。' })).toThrow(/第一人称/);
  });
});

describe('LLM novel blueprint contract', () => {
  const valid = {
    title: '雨声回廊',
    theme: '被重复书写的病历',
    premise: '迷迭香必须沿着逆流雨幕找回姓名。',
    endingHook: '核心深处仍有一页档案没有署名。',
    nodeBriefs: expectedNodes.map((node, index) => ({
      nodeId: node.id,
      nodeType: node.type,
      title: ['安静温室', '碎裂走廊', '残响交换站', '倒影断层', '未解析信号', '无名核心'][index],
      description: '该节点只提供叙事，不改变本地规则。',
    })),
  };

  test('accepts briefs for the exact authoritative local nodes', () => {
    expect(parseNovelBlueprint(valid, expectedNodes)).toEqual(valid);
  });

  test('rejects missing, unknown, duplicate, or type-mutated nodes', () => {
    expect(() => parseNovelBlueprint({ ...valid, nodeBriefs: valid.nodeBriefs.slice(1) }, expectedNodes)).toThrow(/节点数量/);
    expect(() => parseNovelBlueprint({
      ...valid,
      nodeBriefs: valid.nodeBriefs.map((brief, index) => index === 0 ? { ...brief, nodeId: 'unknown' } : brief),
    }, expectedNodes)).toThrow(/未知节点/);
    expect(() => parseNovelBlueprint({
      ...valid,
      nodeBriefs: valid.nodeBriefs.map((brief, index) => index === 1 ? { ...brief, nodeId: expectedNodes[0].id } : brief),
    }, expectedNodes)).toThrow(/重复/);
    expect(() => parseNovelBlueprint({
      ...valid,
      nodeBriefs: valid.nodeBriefs.map((brief, index) => index === 2 ? { ...brief, nodeType: 'combat' } : brief),
    }, expectedNodes)).toThrow(/节点类型/);
  });

  test.each([
    { hiddenType: 'combat' },
    { reward: { echoes: 999 } },
    { overloadDelta: -100 },
    { price: 0 },
    { modifiers: ['free-victory'] },
  ])('rejects hidden outcomes and numeric authority embedded in narrative briefs', (forbidden) => {
    expect(() => parseNovelBlueprint({
      ...valid,
      nodeBriefs: valid.nodeBriefs.map((brief, index) => index === 4 ? { ...brief, ...forbidden } : brief),
    }, expectedNodes)).toThrow(/本地规则|隐藏结果|数值/);
  });
});
