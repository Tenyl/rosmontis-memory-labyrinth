import { describe, expect, test, vi } from 'vitest';
import { createRun } from '../game/run';
import type { TavernRuntimeValue } from '../features/tavern/runtime/TavernProvider';
import type { ChatSession } from '../sillytavern';
import { ensureBoundGameRunSession } from './tavernRunSession';

describe('bound game-run session lifecycle', () => {
  test('reuses a valid Run session so mindsea keeps the first five floors of history', async () => {
    const state = createRun({
      seed: 'BOUND-HISTORY',
      mode: 'preset',
      progression: { firstClear: true, completedRuns: 1 },
      llmEnabled: true,
      contentMode: 'ai-director',
      runId: 'run-bound-history',
      aiBinding: {
        chatId: 'chat-bound-history',
        characterId: 'character-rosmontis',
        personaId: 'persona-doctor',
        presetId: 'preset-director',
        lorebookIds: ['lore-rhodes'],
      },
    });
    const session = {
      id: 'chat-bound-history', purpose: 'game-run', runId: state.run.id,
      characterId: 'character-rosmontis', personaId: 'persona-doctor', presetId: 'preset-director',
      lorebookIds: ['lore-rhodes'], summaries: [{ triggerKey: 'floor-5', kind: 'floor', runId: state.run.id, floor: 5, text: '完成核心花房。', createdAt: '2026-09-01T00:00:00.000Z' }],
    } as ChatSession;
    const createChat = vi.fn();
    const runtime = {
      chats: [session],
      characters: [{ id: 'character-rosmontis' }],
      personas: [{ id: 'persona-doctor' }],
      presets: [{ id: 'preset-director' }],
      lorebooks: [{ id: 'lore-rhodes' }],
      settings: { api: { apiKey: 'connected', baseUrl: 'https://example.invalid/v1' } },
      createChat,
    } as unknown as TavernRuntimeValue;

    const binding = await ensureBoundGameRunSession(runtime, state.run, '无垠心海');

    expect(binding).toEqual(state.run.aiBinding);
    expect(createChat).not.toHaveBeenCalled();
  });
});
