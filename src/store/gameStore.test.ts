import { deepMemoryClue, buildDemoState } from '../data/demoData';
import { useGameStore } from './gameStore';

beforeEach(() => {
  useGameStore.getState().resetDemoState();
});

test('starts with three specified surface-memory nodes', () => {
  const state = buildDemoState();

  expect(state.memoryMap.nodes.map((node) => node.title)).toEqual([
    '雨幕中的疗养院',
    '无声候车厅',
    '编号 R-09 隔离室',
  ]);
});

test('resets mutated stress and archive state', () => {
  useGameStore.getState().setOperatorStress('rosmontis', 57);
  useGameStore.getState().addArchiveRecord(deepMemoryClue);

  useGameStore.getState().resetDemoState();

  expect(useGameStore.getState().operators.byId.rosmontis.stress).toBe(41);
  expect(useGameStore.getState().archive.records).toHaveLength(4);
});
