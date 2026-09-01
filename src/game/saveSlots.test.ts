import { describe, expect, test } from 'vitest';
import { buildDemoState } from '../data/demoData';
import {
  clearSaveSlots,
  createSaveSlot,
  getActiveSaveSlotId,
  hasActiveRunSave,
  listSaveSlots,
  loadSaveSlot,
  setActiveSaveSlotId,
} from './saveSlots';

describe('local run save slots', () => {
  test('starts with three empty slots', () => {
    expect(listSaveSlots(localStorage)).toEqual([
      expect.objectContaining({ id: 'slot-1', snapshot: null }),
      expect.objectContaining({ id: 'slot-2', snapshot: null }),
      expect.objectContaining({ id: 'slot-3', snapshot: null }),
    ]);
  });

  test('writes and restores a complete game snapshot', () => {
    const state = buildDemoState();
    const saved = createSaveSlot('slot-2', state, localStorage, '2026-08-31T10:00:00.000Z');

    expect(saved).toMatchObject({ version: 10 });
    expect(saved.summary).toMatchObject({ floor: 1, mode: 'preset', contentMode: 'local', sanity: 100, overload: 0 });
    expect(loadSaveSlot('slot-2', localStorage)?.state.run).toEqual(state.run);
    expect(listSaveSlots(localStorage)[1].snapshot?.savedAt).toBe('2026-08-31T10:00:00.000Z');
  });

  test('tracks the active slot and recovers safely from malformed storage', () => {
    setActiveSaveSlotId('slot-3', localStorage);
    expect(getActiveSaveSlotId(localStorage)).toBe('slot-3');

    localStorage.setItem('rosmontis-run-save-slots', '{broken');
    expect(listSaveSlots(localStorage).every((slot) => slot.snapshot === null)).toBe(true);

    clearSaveSlots(localStorage);
    expect(getActiveSaveSlotId(localStorage)).toBeNull();
  });

  test('requires a valid snapshot in the active slot without coupling access to a transient Run id', () => {
    const state = buildDemoState();

    setActiveSaveSlotId('slot-1', localStorage);
    expect(hasActiveRunSave(localStorage)).toBe(false);

    createSaveSlot('slot-1', state, localStorage);
    state.run.id = 'RUN-RESTARTED-BEFORE-AUTOSAVE';
    expect(hasActiveRunSave(localStorage)).toBe(true);
  });

  test('migrates a legacy slot through the shared state migration before continuing', () => {
    const legacy = structuredClone(buildDemoState()) as unknown as { run: Record<string, unknown> };
    delete legacy.run.contentMode;
    delete legacy.run.narrativeStyle;
    delete legacy.run.aiFailurePolicy;
    delete legacy.run.aiBinding;
    localStorage.setItem('rosmontis-run-save-slots', JSON.stringify({
      'slot-1': {
        version: 9,
        savedAt: '2026-08-30T10:00:00.000Z',
        summary: { floor: 1, mode: 'preset', nodeId: legacy.run.currentNodeId },
        state: legacy,
      },
    }));

    const restored = loadSaveSlot('slot-1', localStorage);

    expect(restored).toMatchObject({ version: 10, summary: { contentMode: 'local' } });
    expect(restored?.state.run).toMatchObject({
      contentMode: 'local',
      narrativeStyle: 'tactical',
      aiFailurePolicy: 'ask',
      aiBinding: { chatId: null, lorebookIds: [] },
    });
  });
});
