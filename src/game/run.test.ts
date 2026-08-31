import { describe, expect, test } from 'vitest';
import { createRun, getAvailableModes, reduceRunAction } from './run';
import type { MemoryFragment, ProgressionState, RoguelikeState } from './types';

const freshProgression: ProgressionState = { firstClear: false, completedRuns: 0 };
const reward: MemoryFragment = {
  id: 'fragment-test-reward',
  name: '测试记忆碎片',
  kind: 'skill',
  tags: ['测试'],
};

describe('run creation and mode availability', () => {
  test('creates a replayable preset run at the generated start node', () => {
    const input = { seed: 'RUN-001', mode: 'preset' as const, progression: freshProgression, llmEnabled: false };
    const run = createRun(input);

    expect(createRun(input)).toEqual(run);
    expect(run.run).toMatchObject({ mode: 'preset', phase: 'exploring', turn: 1, floor: 1, maxFloor: 5, result: null });
    expect(run.run.currentNodeId).toBe(run.maze.startNodeId);
    expect(run.maze.nodes).toHaveLength(11);
    expect(run.maze.nodes.at(-1)?.type).toBe('boss');
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
  test('blocks movement until the current encounter is resolved', () => {
    const before = createRun({ seed: 'encounter-gate', mode: 'preset', progression: freshProgression, llmEnabled: false });
    const target = before.maze.edges.find((edge) => !edge.locked && edge.sourceId === before.run.currentNodeId)!.targetId;

    const blocked = reduceRunAction(before, { type: 'move-to-node', nodeId: target });
    const resolved = reduceRunAction(before, { type: 'resolve-encounter', choiceId: 'rest-rehearse' });
    const moved = reduceRunAction(resolved.state, { type: 'move-to-node', nodeId: target });

    expect(blocked).toMatchObject({ accepted: false, state: before, reason: '必须先完成当前节点遭遇。' });
    expect(resolved.state.pendingEncounter).toMatchObject({ kind: 'safehouse', resolved: true });
    expect(moved.accepted).toBe(true);
  });

  test('finishing a non-final exit builds the next floor and restores exploration charges', () => {
    const before = createRun({ seed: 'floor-transition', mode: 'preset', progression: freshProgression, llmEnabled: false });
    const atExit = {
      ...before,
      run: { ...before.run, currentNodeId: before.maze.coreNodeId },
      maze: {
        ...before.maze,
        nodes: before.maze.nodes.map((node) => ({
          ...node,
          state: node.id === before.maze.coreNodeId ? 'completed' as const : node.state,
        })),
      },
      pendingEncounter: before.pendingEncounter
        ? { ...before.pendingEncounter, nodeId: before.maze.coreNodeId, resolved: true }
        : null,
      explorationCharges: { breach: 0 as const, watch: 0 as const, perception: 0 as const, resonance: 0 as const },
    };

    const result = reduceRunAction(atExit, { type: 'advance-floor' });

    expect(result.accepted).toBe(true);
    expect(result.state.run.floor).toBe(2);
    expect(result.state.maze.floor).toBe(2);
    expect(result.state.run.currentNodeId).toBe(result.state.maze.startNodeId);
    expect(Object.values(result.state.explorationCharges)).toEqual([1, 1, 1, 1]);
    expect(result.state.pendingEncounter).toMatchObject({ kind: 'safehouse', resolved: false });
  });

  test('moves only along an outgoing path and reveals the next frontier', () => {
    const before = createRun({ seed: 'movement', mode: 'preset', progression: freshProgression, llmEnabled: false });
    const ready = reduceRunAction(before, { type: 'resolve-encounter', choiceId: 'rest-rehearse' }).state;
    const edge = ready.maze.edges.find((item) => item.sourceId === ready.run.currentNodeId && !item.locked)!;
    const invalidTarget = ready.maze.nodes.find((node) => !ready.maze.edges.some((item) => item.sourceId === ready.run.currentNodeId && item.targetId === node.id))!;

    const invalid = reduceRunAction(ready, { type: 'move-to-node', nodeId: invalidTarget.id });
    const moved = reduceRunAction(ready, { type: 'move-to-node', nodeId: edge.targetId });

    expect(invalid).toMatchObject({ accepted: false, state: ready, reason: '目标节点当前不可到达。' });
    expect(moved.accepted).toBe(true);
    expect(moved.state.run.currentNodeId).toBe(edge.targetId);
    expect(moved.state.run.turn).toBe(2);
    expect(moved.state.maze.nodes.find((node) => node.id === ready.run.currentNodeId)?.state).toBe('completed');
    expect(moved.state.maze.nodes.find((node) => node.id === edge.targetId)?.state).toBe('current');
    expect(moved.state.maze.edges
      .filter((item) => item.sourceId === edge.targetId)
      .map((item) => moved.state.maze.nodes.find((node) => node.id === item.targetId)?.state)
      .every((state) => state === 'reachable')).toBe(true);
    expect(moved.state.maze.nodes.filter((node) => node.state === 'reachable').map((node) => node.id).sort()).toEqual(
      moved.state.maze.edges
        .filter((item) => item.sourceId === edge.targetId && !item.locked)
        .map((item) => item.targetId)
        .sort(),
    );
  });

  test('refreshes action points and advances cooldowns when entering a new node', () => {
    const before = createRun({ seed: 'node-resources', mode: 'preset', progression: freshProgression, llmEnabled: false });
    const afterWatch = reduceRunAction(before, {
      type: 'use-greatsword',
      action: { swordId: 'watch', target: 'self', nodeType: 'safehouse' },
    }).state;
    const ready = reduceRunAction(afterWatch, { type: 'resolve-encounter', choiceId: 'rest-rehearse' }).state;
    const target = ready.maze.edges.find((edge) => edge.sourceId === ready.run.currentNodeId && !edge.locked)!.targetId;

    const moved = reduceRunAction(ready, { type: 'move-to-node', nodeId: target });

    expect(afterWatch.rosmontis).toMatchObject({ actionPoints: 3, greatswords: { watch: { cooldown: 1 } } });
    expect(moved.state.rosmontis).toMatchObject({ actionPoints: 4, greatswords: { watch: { cooldown: 0 } } });
  });

  test('completes a node and grants its fragment reward', () => {
    const before = createRun({ seed: 'reward', mode: 'preset', progression: freshProgression, llmEnabled: false });
    const resolution = reduceRunAction(before, { type: 'complete-node', fragment: reward });

    expect(resolution.accepted).toBe(true);
    expect(resolution.state.memoryInventory.fragments).toEqual([reward]);
    expect(resolution.events).toContainEqual({ type: 'fragment.acquired', fragmentId: reward.id, kind: 'skill' });
    expect(before.memoryInventory.fragments).toEqual([]);
  });

  test('encounter settlement recovers a deterministic fragment through the local rule engine', () => {
    const before = createRun({ seed: 'encounter-fragment', mode: 'preset', progression: freshProgression, llmEnabled: false });
    const combatNode = { ...before.maze.nodes[0], type: 'combat' as const, risk: 'C' as const };
    let state: RoguelikeState = {
      ...before,
      maze: { ...before.maze, nodes: [combatNode, ...before.maze.nodes.slice(1)] },
      pendingEncounter: null,
    };
    state = reduceRunAction(state, { type: 'begin-node' }).state;
    state = reduceRunAction(state, { type: 'resolve-encounter', choiceId: 'combat-breach' }).state;
    state = reduceRunAction(state, { type: 'resolve-encounter', choiceId: 'combat-breach' }).state;
    const settled = reduceRunAction(state, { type: 'resolve-encounter', choiceId: 'combat-breach' });

    expect(settled.accepted).toBe(true);
    expect(settled.state.memoryInventory.fragments).toEqual([
      expect.objectContaining({
        id: `fragment-${before.run.id}-${combatNode.id}`,
        kind: 'skill',
        tags: expect.arrayContaining(['战斗', '破壁']),
      }),
    ]);
    expect(settled.events).toContainEqual({
      type: 'fragment.acquired',
      fragmentId: `fragment-${before.run.id}-${combatNode.id}`,
      kind: 'skill',
    });
  });

  test('settles each maze node only once even when no fragment is awarded', () => {
    const before = createRun({ seed: 'single-settlement', mode: 'preset', progression: freshProgression, llmEnabled: false });
    const first = reduceRunAction(before, { type: 'complete-node' });
    const repeated = reduceRunAction(first.state, { type: 'complete-node' });

    expect(first.accepted).toBe(true);
    expect(first.state.maze.nodes.find((node) => node.id === before.run.currentNodeId)?.state).toBe('completed');
    expect(repeated).toMatchObject({
      accepted: false,
      state: first.state,
      reason: '当前节点已经完成结算。',
      events: [],
    });
  });

  test('delegates greatsword settlement without bypassing its resource rules', () => {
    const before = createRun({ seed: 'sword-action', mode: 'preset', progression: freshProgression, llmEnabled: false });
    const resolution = reduceRunAction(before, {
      type: 'use-greatsword',
      action: { swordId: 'watch', target: 'self', nodeType: 'safehouse' },
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
    const rewardNodeId = state.maze.edges.find((edge) => edge.sourceId === state.run.currentNodeId)!.targetId;
    state = reduceRunAction(state, { type: 'move-to-node', nodeId: rewardNodeId }).state;
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
    const before = createRun({ seed: 'victory', mode: 'preset', progression: freshProgression, llmEnabled: false, floor: 5 });
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

  test('completes the memory core through its protected fragment and one legal resonance action', () => {
    const before = createRun({ seed: 'core-route', mode: 'preset', progression: freshProgression, llmEnabled: false, floor: 5 });
    const coreFragment: MemoryFragment = {
      id: 'fragment-core-route',
      name: '核心记忆：仍被呼唤的名字',
      kind: 'core',
      tags: ['核心'],
    };
    const atCore = {
      ...before,
      run: { ...before.run, currentNodeId: before.maze.coreNodeId },
      maze: {
        ...before.maze,
        nodes: before.maze.nodes.map((node) => ({
          ...node,
          state: node.id === before.maze.coreNodeId ? 'current' as const : node.state === 'current' ? 'completed' as const : node.state,
        })),
      },
    };

    const settled = reduceRunAction(atCore, { type: 'complete-node', fragment: coreFragment });
    const resonated = reduceRunAction(settled.state, {
      type: 'use-greatsword',
      action: { swordId: 'resonance', target: 'memory', nodeType: 'boss' },
    });
    const victory = reduceRunAction(resonated.state, { type: 'stabilize-core' });

    expect(settled.state.rosmontis.coreStability).toBe(75);
    expect(settled.state.memoryInventory.coreFragments).toEqual([coreFragment]);
    expect(resonated.state.rosmontis.coreStability).toBe(100);
    expect(victory.state.run.phase).toBe('victory');
  });
});
