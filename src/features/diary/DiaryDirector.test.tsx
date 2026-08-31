import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { DiaryDraft } from '../../game/types';
import type { ApiSettings } from '../../sillytavern';
import { clearAllData, getChats, getSettings, initializeDatabase, saveChat, saveSettings } from '../../sillytavern/database';
import { DEFAULT_CHARACTER_ID, DEFAULT_PERSONA_ID, DEFAULT_PRESET_ID } from '../../sillytavern/default-content';
import { useGameStore } from '../../store/gameStore';
import { listDiaryEntries } from '../../diary/repository';
import { TavernProvider } from '../tavern/runtime/TavernProvider';
import type { TavernTransport } from '../tavern/runtime/tavern-transport';
import { DiaryDirector } from './DiaryDirector';

const api: ApiSettings = {
  baseUrl: 'https://llm.example/v1',
  apiKey: 'sk-test-only',
  model: 'diary-model',
  timeout: 1000,
};

const draft: DiaryDraft = {
  id: 'diary-pending-floor-two',
  triggerKey: 'floor-completed:run-test:2',
  title: '第二层也会成为过去',
  body: '我离开了第二层。博士还在这里。',
  source: 'local',
  createdAt: 'pending-write',
  runId: 'run-test',
  floor: 2,
};

beforeEach(async () => {
  await clearAllData();
  useGameStore.getState().resetDemoState();
  await initializeDatabase();
  const settings = (await getSettings())!;
  await saveSettings({ ...settings, api });
  const session = (await getChats())[0];
  await saveChat({ ...session, purpose: 'game-run', runId: 'run-test' });
  act(() => {
    useGameStore.setState((state) => ({
      run: {
        ...state.run,
        id: 'run-test',
        floor: 2,
        contentMode: 'ai-director',
        aiBinding: {
          chatId: session.id,
          characterId: DEFAULT_CHARACTER_ID,
          personaId: DEFAULT_PERSONA_ID,
          presetId: DEFAULT_PRESET_ID,
          lorebookIds: [...session.lorebookIds],
        },
      },
      pendingDiaryDrafts: [{ ...draft }],
    }));
  });
});

function renderDirector(transport: TavernTransport, apiOverride: ApiSettings | null = api) {
  return render(
    <TavernProvider>
      <DiaryDirector apiOverride={apiOverride} transportOverride={transport} />
    </TavernProvider>,
  );
}

describe('diary director', () => {
  test('persists one validated remote diary for a stable local trigger', async () => {
    const stream = vi.fn(async function* () {
      yield '{"title":"雨声变轻以后","body":"我把第二层留在身后，也把博士的手记在了心里。"}';
    });
    renderDirector({ mode: 'remote', stream });

    await waitFor(() => expect(useGameStore.getState().pendingDiaryDrafts).toHaveLength(0));
    const entries = await listDiaryEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      triggerKey: draft.triggerKey,
      title: '雨声变轻以后',
      source: 'remote',
    });
    expect(stream).toHaveBeenCalledTimes(1);
    expect(stream).toHaveBeenCalledWith(expect.objectContaining({ gameTask: 'diary' }), expect.any(AbortSignal));
  });

  test('falls back to the local draft when the remote diary is malformed', async () => {
    const stream = vi.fn(async function* () { yield '{"title":"缺少正文"}'; });
    const beforeRun = structuredClone(useGameStore.getState().run);
    renderDirector({ mode: 'remote', stream });

    await waitFor(() => expect(useGameStore.getState().pendingDiaryDrafts).toHaveLength(0));
    const entries = await listDiaryEntries();
    expect(entries[0]).toMatchObject({ title: draft.title, body: draft.body, source: 'local' });
    expect(useGameStore.getState().run).toEqual(beforeRun);
    expect(useGameStore.getState().ui.notifications.some((item) => item.id.includes('diary-fallback'))).toBe(true);
  });

  test('writes locally without contacting a model when API is not configured', async () => {
    const stream = vi.fn(async function* () { yield '{}'; });
    renderDirector({ mode: 'remote', stream }, null);

    await waitFor(() => expect(useGameStore.getState().pendingDiaryDrafts).toHaveLength(0));
    expect((await listDiaryEntries())[0]?.source).toBe('local');
    expect(stream).not.toHaveBeenCalled();
  });

  test('retains the pending draft if IndexedDB persistence fails', async () => {
    const stream = vi.fn(async function* () { yield '{}'; });
    const persist = vi.fn().mockRejectedValue(new Error('database unavailable'));
    render(
      <TavernProvider>
        <DiaryDirector apiOverride={null} transportOverride={{ mode: 'remote', stream }} persistOverride={persist} />
      </TavernProvider>,
    );

    await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
    expect(useGameStore.getState().pendingDiaryDrafts).toEqual([draft]);
    expect(useGameStore.getState().ui.notifications.some((item) => item.id.includes('diary-write'))).toBe(true);
  });
});
