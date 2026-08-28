import { describe, expect, it } from 'vitest';
import { createLorebookEngine } from './lorebook-engine';
import type { Lorebook, LorebookEntry } from './types';

function makeLorebook(overrides: Partial<LorebookEntry> = {}): Lorebook {
  return {
    id: 'book-rhodes',
    name: '罗德岛认知协议',
    description: '用于验证主、次关键词选择逻辑。',
    entries: [
      {
        id: 'entry-memory',
        keys: ['迷迭香'],
        secondaryKeys: ['记忆'],
        content: '认知干员正在读取记忆残响。',
        comment: '选择逻辑测试条目',
        order: 100,
        position: 'after_char',
        depth: 4,
        role: 0,
        selective: true,
        selectiveLogic: 'and_all',
        constant: false,
        probability: 100,
        useProbability: false,
        addMemo: false,
        sticky: 0,
        cooldown: 0,
        delay: 0,
        weight: 100,
        scanDepth: 0,
        caseSensitive: false,
        matchWholeWords: false,
        excludeRecursion: false,
        preventRecursion: false,
        useGroupScoring: false,
        matchPersonaDescription: false,
        matchCharacterDescription: false,
        matchCharacterPersonality: false,
        matchCharacterDepthPrompt: false,
        matchScenario: false,
        matchCreatorNotes: false,
        group: '',
        decorators: [],
        characterFilter: { isExclude: false, names: [], tags: [] },
        ...overrides,
      },
    ],
    recursiveScanning: false,
    caseSensitive: false,
    matchWholeWords: false,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('LorebookEngine', () => {
  it('requires a secondary keyword for an and_all selective entry', () => {
    const engine = createLorebookEngine(makeLorebook());

    expect(engine.scan('迷迭香进入走廊')).toHaveLength(0);
    expect(engine.scan('迷迭香进入记忆走廊')).toHaveLength(1);
  });
});
