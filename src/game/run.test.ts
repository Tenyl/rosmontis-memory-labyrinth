import { describe, expect, test } from 'vitest';
import { createRun, getAvailableModes, reduceRunAction } from './run';
import type { MemoryFragment, ProgressionState } from './types';

const freshProgression: ProgressionState = { firstClear: false, completedRuns: 0 };
const reward: MemoryFragment = {
  id: 'fragment-test-reward',
  name: '测试记忆碎片',
  kind: 'standard',
  tags: ['测试'],
};

describe('run creation and mode availability', () => {
  test('creates a replayable preset run at the generated start node', () => {
    const input = { seed: 'RUN-001', mode: 'preset' as const, progression: freshProgression, llmEnabled: false };
    const run = createRun(input);

    expect(createRun(input)).toEqual(run);
    expect(run.run).toMatchObject({ mode: 'preset', phase: 'exploring', turn: 1, floor: 1, result: null });
    expect(run.run.currentNodeId).toBe(run.maze.startNodeId);
    expect(run.rosmontis).toMatchObject({ sanity: 100, overload: 0, actionPoints: 4 });
    expect(run.memoryInventory).toMatchObject({ capacity: 3, fragments: [], coreFragments: [], pendingFragment: null });
  });

  test('unlocks local endless after first clear while novel additionally requires LLM', () => {
    expect(getAvailableModes(freshProgression, false)).toEqual(['preset']);
    expect(getAvailableModes({ firstClear: true, completedRuns: 1 }, false)).toEqual(['preset', 'endless']);
    expect(getAvailableModes({ firstClear: true, completedRuns: 1 }, true)).toEqual(['preset', 'endless', 'novel']);
  });

  test('rejects locked endless and novel modes', () => {
    expect(() => createRun({ seed: 'locked', mode: 'endless', progression: freshProgression, llmEnabled: false })).toThrow(/尚未解锁/);
    expect(() => createRun({ seed: 'no-llm', mode: 'novel', progression: { firstClear: true, completedRuns: 1 }, llmEnabled: false })).toThrow(/LLM/);
  });
});

describe('run reducer', () => {
  test('moves only along an outgoing path and reveals the next frontier', () => {
    const before = createRun({ seed: 'movement', mode: 'preset', progression: freshProgression, llmEnabled: false });
    const edge = before.maze.edges.find((item) => item.sourceId === before.run.currentNodeId)!;
    const invalidTarget = before.maze.nodes.find((node) => !before.maze.edges.some((item) => item.sourceId === before.run.currentNodeId && item.targetId === node.id))!;

    const invalid = reduceRunAction(before, { type: 'move-to-node', nodeId: invalidTarget.id });
    const moved = reduceRunAction(before, { type: 'move-to-node', nodeId: edge.targetId });

    expect(invalid).toMatchObject({ accepted: false, state: before, reason: '目标节点当前不可到达。' });
    expect(moved.accepted).toBe(true);
    expect(moved.state.run.currentNodeId).toBe(edge.targetId);
    expect(moved.state.run.turn).toBe(2);
    expect(moved.state.maze.nodes.find((node) => node.id === before.run.currentNodeId)?.state).toBe('completed');
    expect(moved.state.maze.nodes.find((node) => node.id === edge.targetId)?.state).toBe('current');
    expect(moved.state.maze.edges
      .filter((item) => item.sourceId === edge.targetId)
      .map((item) => moved.state.maze.nodes.find((node) => node.id === item.targetId)?.state)
      .every((state) => state === 'reachable')).toBe(true);
  });

  test('completes a node and grants its fragment reward', () => {
    const before = createRun({ seed: 'reward', mode: 'preset', progression: freshProgression, llmEnabled: false });
    const resolution = reduceRunAction(before, { type: 'complete-node', fragment: reward });

    expect(resolution.accepted).toBe(true);
    expect(resolution.state.memoryInventory.fragments).toEqual([reward]);
    expect(resolution.events).toContainEqual({ type: 'fragment.acquired', fragmentId: reward.id, kind: 'standard' });
    expect(before.memoryInventory.fragments).toEqual([]);
  });

  test('delegates greatsword settlement without bypassing its resource rules', () => {
    const before = createRun({ seed: 'sword-action', mode: 'preset', progression: freshProgression, llmEnabled: false });
    const resolution = reduceRunAction(before, {
      type: 'use-greatsword',
      action: { swordId: 'watch', target: 'self', nodeType: 'thought-rest' },
    });

    expect(resolution.accepted).toBe(true);
    expect(resolution.state.rosmontis).toMatchObject({ actionPoints: 3, guard: 24, overload: 5 });
    expect(resolution.events).toContainEqual({
      type: 'greatsword.used',
      swordId: 'watch',
      actionPointCost: 1,
      overloadDelta: 5,
      cooldown: 1,
    });
  });

  test('blocks movement while fragment overflow is unresolved', () => {
    let state = createRun({ seed: 'overflow', mode: 'preset', progression: freshProgression, llmEnabled: false });
    state = { ...state, memoryInventory: { ...state.memoryInventory, capacity: 1 } };
    state = reduceRunAction(state, { type: 'complete-node', fragment: reward }).state;
    const overflowFragment = { ...reward, id: 'fragment-overflow' };
    state = reduceRunAction(state, { type: 'complete-node', fragment: overflowFragment }).state;
    const target = state.maze.edges.find((edge) => edge.sourceId === state.run.currentNodeId)!.targetId;

    const blocked = reduceRunAction(state, { type: 'move-to-node', nodeId: target });
    const resolved = reduceRunAction(state, { type: 'resolve-fragment-overflow', choice: { type: 'discard-pending' } });

    expect(state.run.phase).toBe('fragment-overflow');
    expect(blocked).toMatchObject({ accepted: false, state, reason: '必须先处理记忆碎片溢出。' });
    expect(resolved.state.run.phase).toBe('exploring');
  });

  test.each([
    { sanityDelta: -100, overloadDelta: 0 },
    { sanityDelta: 0, overloadDelta: 100 },
  ])('ends in defeat at a vital failure threshold', (change) => {
    const before = createRun({ seed: 'defeat', mode: 'preset', progression: freshProgression, llmEnabled: false });
    const resolution = reduceRunAction(before, { type: 'apply-vitals', ...change });

    expect(resolution.state.run).toMatchObject({ phase: 'defeat', result: 'defeat' });
    expect(resolution.events).toContainEqual({ type: 'run.ended', result: 'defeat' });
  });

  test('stabilizing the current memory core wins and records the first clear', () => {
    const before = createRun({ seed: 'victory', mode: 'preset', progression: freshProgression, llmEnabled: false });
    const atCore = {
      ...before,
      run: { ...before.run, currentNodeId: before.maze.coreNodeId },
      rosmontis: { ...before.rosmontis, coreStability: 100 },
      maze: {
        ...before.maze,
        nodes: before.maze.nodes.map((node) => ({
          ...node,
          state: node.id === before.maze.coreNodeId ? 'current' as const : node.state === 'current' ? 'completed' as const : node.state,
        })),
      },
    };

    const resolution = reduceRunAction(atCore, { type: 'stabilize-core' });

    expect(resolution.accepted).toBe(true);
    expect(resolution.state.run).toMatchObject({ phase: 'victory', result: 'victory' });
    expect(resolution.state.progression).toEqual({ firstClear: true, completedRuns: 1 });
    expect(getAvailableModes(resolution.state.progression, false)).toEqual(['preset', 'endless']);
  });
});
