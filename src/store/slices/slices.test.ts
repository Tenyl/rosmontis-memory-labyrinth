import { expect, test } from 'vitest';
import { createRun } from '../../game/run';
import { createDiarySlice } from './diarySlice';
import { createInventorySlice } from './inventorySlice';
import { createLlmDirectorSlice } from './llmDirectorSlice';
import { createMazeSlice } from './mazeSlice';
import { createRosmontisSlice } from './rosmontisSlice';
import { createRunSlice } from './runSlice';

test('composes independent domain slices from one roguelike snapshot', () => {
  const state = createRun({
    seed: 'SLICE-COMPOSITION',
    mode: 'preset',
    progression: { firstClear: false, completedRuns: 0 },
    llmEnabled: false,
  });
  const composed = {
    ...createRunSlice(state),
    ...createMazeSlice(state),
    ...createRosmontisSlice(state),
    ...createInventorySlice(state),
    ...createDiarySlice(),
    ...createLlmDirectorSlice(state.run.id),
  };

  expect(composed.run.id).toBe(state.run.id);
  expect(composed.maze).toEqual(state.maze);
  expect(composed.maze).not.toBe(state.maze);
  expect(composed.rosmontis).not.toBe(state.rosmontis);
  expect(composed.memoryInventory).not.toBe(state.memoryInventory);
  expect(composed.pendingDiaryDrafts).toEqual([]);
  expect(composed.llmDirector.runId).toBe(state.run.id);
});
