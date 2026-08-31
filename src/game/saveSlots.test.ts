import { describe, expect, test } from 'vitest';
import { buildDemoState } from '../data/demoData';
import {
  clearSaveSlots,
  createSaveSlot,
  getActiveSaveSlotId,
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

    expect(saved.summary).toMatchObject({ floor: 1, mode: 'preset', sanity: 100, overload: 0 });
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
});
