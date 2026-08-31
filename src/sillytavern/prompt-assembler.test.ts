import { describe, it, expect } from 'vitest';
import { assemblePrompt } from './prompt-assembler';

describe('assemblePrompt formatPrompt injection', () => {
  it('injects formatPrompt as a system message', () => {
    const out = assemblePrompt({
      userInput: 'hi',
      history: [],
      preset: { id: 'p', name: 'p', settings: {}, createdAt: 0, updatedAt: 0 },
      lorebooks: [],
      userName: 'Alice',
      characterName: 'Bob',
      formatPrompt: 'FORMAT_INSTRUCTIONS_HERE',
      extraVariables: { hp: 100 },
    });
    const sysJoined = out.messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
    expect(sysJoined).toContain('FORMAT_INSTRUCTIONS_HERE');
  });

  it('exposes extraVariables in system context', () => {
    const out = assemblePrompt({
      userInput: 'hi',
      history: [],
      preset: { id: 'p', name: 'p', settings: {}, createdAt: 0, updatedAt: 0 },
      lorebooks: [],
      userName: 'Alice',
      characterName: 'Bob',
      extraVariables: { hp: 42 },
    });
    const sysJoined = out.messages.filter(m => m.role === 'system').map(m => m.content).join('\n');
    expect(sysJoined).toMatch(/42/);
  });

  it('can scan an explicit read-only director snapshot for lorebook matches', () => {
    const out = assemblePrompt({
      userInput: '生成节点。',
      scanText: '雨声覆盖了走廊。',
      history: [],
      preset: {
        id: 'p', name: 'p', settings: { prompt_order: [{ identifier: 'worldInfoBefore', enabled: true }] },
        createdAt: 0, updatedAt: 0,
      },
      lorebooks: [{
        id: 'book', name: 'book', recursiveScanning: false, caseSensitive: false, matchWholeWords: false,
        createdAt: 0, updatedAt: 0,
        entries: [{ id: 'rain', keys: ['雨'], secondaryKeys: [], content: '命中的雨幕条目', order: 1,
          position: 'before_char', selective: false, selectiveLogic: 'and_any', constant: false,
          probability: 100, addMemo: false }],
      }],
    });

    expect(out.matchedEntries.map((match) => match.entry.id)).toEqual(['rain']);
    expect(out.systemPrompt).toContain('命中的雨幕条目');
  });

  it('assembles character card and persona fields into ordered prompts', () => {
    const out = assemblePrompt({
      userInput: '检查雨声',
      history: [],
      preset: {
        id: 'p-character',
        name: '角色装配测试',
        settings: {
          main: '{{char}}接受{{user}}的战术指令。',
          prompt_order: [
            { identifier: 'main', role: 'system', enabled: true },
            { identifier: 'charDescription', role: 'system', enabled: true },
            { identifier: 'charPersonality', role: 'system', enabled: true },
            { identifier: 'scenario', role: 'system', enabled: true },
            { identifier: 'personaDescription', role: 'system', enabled: true },
            { identifier: 'dialogueExamples', role: 'system', enabled: true },
          ],
        },
        createdAt: 0,
        updatedAt: 0,
      },
      lorebooks: [],
      userName: '旧用户',
      characterName: '旧角色',
      character: {
        id: 'character-rosmontis',
        name: '迷迭香',
        description: '罗德岛精英干员',
        personality: '寡言而敏锐',
        scenario: '进入受污染的意识回廊',
        firstMessage: '链接稳定。',
        messageExample: '{{user}}：报告。\n{{char}}：三个声源。',
        creatorNotes: '',
        systemPrompt: '所有判断必须可追溯。',
        postHistoryInstructions: '每轮给出可观察线索。',
        alternateGreetings: [],
        tags: [],
        creator: 'Rhodes',
        characterVersion: '1.0',
        extensions: {},
        createdAt: 0,
        updatedAt: 0,
      },
      persona: {
        id: 'persona-doctor',
        name: '博士',
        description: '现场战术决策者',
        variables: {},
        createdAt: 0,
        updatedAt: 0,
      },
    });
    const system = out.messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n');

    expect(system).toContain('迷迭香接受博士的战术指令。');
    expect(system).toContain('罗德岛精英干员');
    expect(system).toContain('所有判断必须可追溯。');
    expect(system).toContain('寡言而敏锐');
    expect(system).toContain('进入受污染的意识回廊');
    expect(system).toContain('现场战术决策者');
    expect(system).toContain('博士：报告。');
    expect(system).toContain('迷迭香：三个声源。');
    expect(system).toContain('每轮给出可观察线索。');
  });
});
