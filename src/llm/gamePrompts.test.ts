import { describe, expect, test } from 'vitest';
import { buildDiaryPrompt, buildEventPrompt, buildNovelPrompt, buildQuotePrompt } from './gamePrompts';

describe('task-specific LLM game prompts', () => {
  test('event prompt carries narrative context and only whitelisted local D20 proposals', () => {
    const messages = buildEventPrompt({
      seed: 'RAIN-09',
      floor: 2,
      nodeType: 'encounter',
      sanity: 63,
      overload: 41,
      fragmentNames: ['逆流的雨声'],
    });
    const prompt = messages.map((message) => message.content).join('\n');

    expect(messages.map((message) => message.role)).toEqual(['system', 'user']);
    expect(prompt).toContain('2 至 3');
    expect(prompt).toContain('guard | scan | press-on | recover | resonate');
    expect(prompt).toContain('逆流的雨声');
    expect(prompt).toContain('stability、perception、will');
    expect(prompt).toContain('8、10、12、14、16、18');
    expect(prompt).toContain('创伤疗愈期');
    expect(prompt).not.toContain('apiKey');
  });

  test('switches to the healed companion persona from floor six onward', () => {
    const prompt = buildNovelPrompt({ seed: 'SEA', floor: 6, sanity: 80, overload: 10, fragmentNames: ['甲板晚风'], nodes: [{ id: 'sea-a', type: 'safehouse' }] }).map((message) => message.content).join('\n');
    expect(prompt).toContain('无垠心海');
    expect(prompt).toContain('已经释怀');
    expect(prompt).toContain('甲板晚风');
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
        { id: 'maze-a', type: 'safehouse' },
        { id: 'maze-b', type: 'boss' },
      ],
    }).map((message) => message.content).join('\n');

    expect(prompt).toContain('maze-a');
    expect(prompt).toContain('safehouse');
    expect(prompt).toContain('maze-b');
    expect(prompt).toMatch(/不得新增、删除、重排或重连节点/);
    expect(prompt).toMatch(/hiddenType.*只读|隐藏结果.*只读/);
    expect(prompt).toMatch(/奖励、价格.*只读|价格、奖励.*只读/);
    expect(prompt).toContain('nodeBriefs');
  });

  test('diary prompt keeps the local trigger as read-only context and requests first-person prose only', () => {
    const prompt = buildDiaryPrompt({
      triggerKey: 'floor-completed:run-a:2',
      floor: 2,
      sanity: 56,
      overload: 73,
      localTitle: '第二层也会成为过去',
      localBody: '我离开了雨声。',
      fragmentNames: ['甲板晚风'],
    }).map((message) => message.content).join('\n');

    expect(prompt).toContain('第一人称');
    expect(prompt).toContain('floor-completed:run-a:2');
    expect(prompt).toContain('甲板晚风');
    expect(prompt).toContain('{"title"');
    expect(prompt).not.toContain('doctorNote');
  });
});
