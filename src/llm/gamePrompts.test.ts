import { describe, expect, test } from 'vitest';
import { buildEventPrompt, buildNovelPrompt, buildQuotePrompt } from './gamePrompts';

describe('task-specific LLM game prompts', () => {
  test('event prompt carries only narrative context and forbids numeric authority', () => {
    const messages = buildEventPrompt({
      seed: 'RAIN-09',
      floor: 2,
      nodeType: 'wonder',
      sanity: 63,
      overload: 41,
      fragmentNames: ['逆流的雨声'],
    });
    const prompt = messages.map((message) => message.content).join('\n');

    expect(messages.map((message) => message.role)).toEqual(['system', 'user']);
    expect(prompt).toContain('2 至 3');
    expect(prompt).toContain('guard | scan | press-on | recover | resonate');
    expect(prompt).toContain('逆流的雨声');
    expect(prompt).toMatch(/不得.*数值|禁止.*数值/);
    expect(prompt).not.toContain('apiKey');
  });

  test('quote prompt requires Rosmontis first person and no more than 30 characters', () => {
    const prompt = buildQuotePrompt({
      actionSummary: '守望巨剑展开护盾',
      eventTitle: '逆流雨幕',
      sanity: 58,
      overload: 72,
    }).map((message) => message.content).join('\n');

    expect(prompt).toContain('迷迭香第一人称');
    expect(prompt).toContain('30');
    expect(prompt).toContain('守望巨剑展开护盾');
  });

  test('novel prompt binds every brief to the existing local node identifiers and types', () => {
    const prompt = buildNovelPrompt({
      seed: 'NOVEL-01',
      floor: 3,
      sanity: 72,
      overload: 41,
      fragmentNames: ['潮湿病历'],
      nodes: [
        { id: 'maze-a', type: 'rest' },
        { id: 'maze-b', type: 'boss' },
      ],
    }).map((message) => message.content).join('\n');

    expect(prompt).toContain('maze-a');
    expect(prompt).toContain('rest');
    expect(prompt).toContain('maze-b');
    expect(prompt).toMatch(/不得新增、删除、重排或重连节点/);
    expect(prompt).toMatch(/hiddenType.*只读|隐藏结果.*只读/);
    expect(prompt).toMatch(/奖励、价格.*只读|价格、奖励.*只读/);
    expect(prompt).toContain('nodeBriefs');
  });
});
