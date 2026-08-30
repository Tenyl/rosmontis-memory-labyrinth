import { describe, expect, test } from 'vitest';
import {
  parseIndependentEvent,
  parseNovelBlueprint,
  parseTemporaryQuote,
} from './gameContent';

const expectedNodes = [
  { id: 'maze-1-start', type: 'rest' as const },
  { id: 'maze-1-event', type: 'wonder' as const },
  { id: 'maze-1-core', type: 'boss' as const },
];

describe('LLM independent event contract', () => {
  test('accepts a fresh event with two or three allowlisted choices', () => {
    const raw = {
      title: '逆流雨幕',
      situation: '雨滴正在带走走廊里的倒影。',
      choices: [
        { id: 'scan-rain', label: '读取雨声', description: '确认雨滴中的记忆残留。', intent: 'scan' },
        { id: 'hold-line', label: '维持边界', description: '拒绝让异常接近。', intent: 'guard' },
      ],
    };

    const parsed = parseIndependentEvent(raw);

    expect(parsed).toEqual(raw);
    expect(parsed).not.toBe(raw);
    expect(parsed.choices).not.toBe(raw.choices);
  });

  test('rejects option counts outside two to three', () => {
    expect(() => parseIndependentEvent({
      title: '逆流雨幕',
      situation: '雨滴正在带走倒影。',
      choices: [{ id: 'scan', label: '读取雨声', description: '确认残留记忆。', intent: 'scan' }],
    })).toThrow(/2 至 3/);
  });

  test.each([
    { id: 'bad-effect', label: '读取', description: '读取雨声。', intent: 'scan', effect: { overloadDelta: 20 } },
    { id: 'bad-threshold', label: '读取', description: '读取雨声。', intent: 'scan', threshold: 16 },
    { id: 'bad-intent', label: '读取', description: '读取雨声。', intent: 'erase-save' },
  ])('rejects numeric authority or unknown intent in an event choice', (choice) => {
    expect(() => parseIndependentEvent({
      title: '非法事件',
      situation: '模型试图越过本地规则。',
      choices: [
        choice,
        { id: 'safe', label: '维持边界', description: '保持当前状态。', intent: 'guard' },
      ],
    })).toThrow(/数值|意图/);
  });
});

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
      title: ['安静温室', '倒影断层', '无名核心'][index],
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
});
