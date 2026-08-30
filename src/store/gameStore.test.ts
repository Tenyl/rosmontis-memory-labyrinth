import { deepMemoryClue, buildDemoState } from '../data/demoData';
import { projectTavernTurn } from '../features/tavern/projection/tavern-turn-projector';
import type { MemoryFragment } from '../game/types';
import { sanitizeSingleProtagonistState, useGameStore } from './gameStore';

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

test('keeps only the initial scenario and preferences when autosave is disabled', () => {
  useGameStore.getState().setUiPreference('autosave', false);
  useGameStore.getState().setOperatorStress('rosmontis', 57);

  const persisted = JSON.parse(localStorage.getItem('rhodes-cognition-terminal-state') ?? '{}');

  expect(persisted.state.operators.byId.rosmontis.stress).toBe(41);
  expect(persisted.state.ui.preferences.autosave).toBe(false);
});

test('旧持久化状态载入时过滤其他干员', () => {
  const legacyState = buildDemoState();
  const legacyOperator = {
    ...legacyState.operators.byId.rosmontis,
    id: 'legacy-companion',
    name: '旧随行干员',
  };
  legacyState.operators = {
    byId: {
      ...legacyState.operators.byId,
      [legacyOperator.id]: legacyOperator,
    },
    squadOrder: ['rosmontis', legacyOperator.id],
    formation: '旧小队编成',
  };

  const migrated = sanitizeSingleProtagonistState(legacyState);

  expect(Object.keys(migrated.operators.byId)).toEqual(['rosmontis']);
  expect(migrated.operators.squadOrder).toEqual(['rosmontis']);
  expect(migrated.operators.formation).toBe('单人认知潜入');
});

test('starts and advances a deterministic Run through store adapters', () => {
  useGameStore.getState().startRun('STORE-RUN', 'preset', false);
  let state = useGameStore.getState();
  const target = state.maze.edges.find((edge) => (
    edge.sourceId === state.run.currentNodeId
    && state.maze.nodes.find((node) => node.id === edge.targetId)?.state === 'reachable'
  ))!.targetId;

  expect(state.run).toMatchObject({ seed: 'STORE-RUN', mode: 'preset', phase: 'exploring' });
  useGameStore.getState().moveToNode(target);
  state = useGameStore.getState();

  expect(state.run.currentNodeId).toBe(target);
  expect(state.ruleLog.at(-1)).toMatchObject({ type: 'run.moved', targetNodeId: target });
});

test('settles greatswords through pure rules and synchronizes the status-page adapter', () => {
  useGameStore.getState().startRun('STORE-SWORD', 'preset', false);
  useGameStore.getState().useGreatsword({ swordId: 'watch', target: 'self', nodeType: 'thought-rest' });
  const state = useGameStore.getState();

  expect(state.rosmontis).toMatchObject({ actionPoints: 3, overload: 5, guard: 24 });
  expect(state.operators.byId.rosmontis).toMatchObject({ actionPoints: 3, stress: 5, sanity: 100 });
  expect(state.ruleLog.at(-1)).toMatchObject({ type: 'greatsword.used', swordId: 'watch' });
});

test('resolves a persisted fragment overflow choice through the store adapter', () => {
  useGameStore.getState().startRun('STORE-FRAGMENT', 'preset', false);
  useGameStore.setState((state) => ({
    run: { ...state.run, phase: 'fragment-overflow' },
    memoryInventory: {
      ...state.memoryInventory,
      capacity: 1,
      fragments: [{ id: 'kept', name: '保留记忆', kind: 'standard', tags: [] }],
      pendingFragment: { id: 'pending', name: '待选记忆', kind: 'standard', tags: [] },
    },
  }));

  useGameStore.getState().resolveFragmentChoice({ type: 'replace', fragmentId: 'kept' });
  const state = useGameStore.getState();

  expect(state.run.phase).toBe('exploring');
  expect(state.memoryInventory.fragments.map((fragment) => fragment.id)).toEqual(['pending']);
  expect(state.memoryInventory.pendingFragment).toBeNull();
});

test('completes the current node through rules and blocks the Run on fragment overflow', () => {
  const reward: MemoryFragment = {
    id: 'fragment-store-overflow',
    name: '走廊尽头的雨声',
    kind: 'standard',
    tags: ['雨声'],
  };
  useGameStore.getState().startRun('STORE-NODE-REWARD', 'preset', false);
  useGameStore.setState((state) => ({
    memoryInventory: {
      ...state.memoryInventory,
      capacity: 1,
      fragments: [{ id: 'fragment-kept', name: '仍被记住的名字', kind: 'standard', tags: ['名字'] }],
    },
  }));

  useGameStore.getState().completeCurrentNode(reward);
  const state = useGameStore.getState();

  expect(state.run.phase).toBe('fragment-overflow');
  expect(state.memoryInventory.pendingFragment).toEqual(reward);
  expect(state.ruleLog.slice(-2)).toEqual([
    { type: 'node.completed', nodeId: state.run.currentNodeId },
    { type: 'fragment.overflow', fragmentId: reward.id },
  ]);
});

test('applies vital changes through rules and synchronizes a defeated Rosmontis', () => {
  useGameStore.getState().startRun('STORE-VITALS', 'preset', false);

  useGameStore.getState().applyRunVitals(-100, 0);
  const state = useGameStore.getState();

  expect(state.run).toMatchObject({ phase: 'defeat', result: 'defeat' });
  expect(state.rosmontis.sanity).toBe(0);
  expect(state.operators.byId.rosmontis).toMatchObject({
    sanity: 0,
    stress: 0,
    condition: '认知链路中断',
  });
  expect(state.ruleLog.at(-1)).toEqual({ type: 'run.ended', result: 'defeat' });
});

test('stabilizes the current memory core and persists first-clear progression', () => {
  useGameStore.getState().startRun('STORE-FIRST-CLEAR', 'preset', false);
  useGameStore.setState((state) => ({
    run: { ...state.run, currentNodeId: state.maze.coreNodeId },
    rosmontis: { ...state.rosmontis, coreStability: 100 },
    maze: {
      ...state.maze,
      nodes: state.maze.nodes.map((node) => ({
        ...node,
        state: node.id === state.maze.coreNodeId
          ? 'current'
          : node.state === 'current' ? 'completed' : node.state,
      })),
    },
  }));

  useGameStore.getState().stabilizeMemoryCore();
  const state = useGameStore.getState();

  expect(state.run).toMatchObject({ phase: 'victory', result: 'victory' });
  expect(state.progression).toEqual({ firstClear: true, completedRuns: 1 });
  expect(state.ruleLog.at(-1)).toEqual({ type: 'run.ended', result: 'victory' });
});

test('persists the explicit roguelike schema version', () => {
  useGameStore.getState().setOperatorStress('rosmontis', 44);
  const persisted = JSON.parse(localStorage.getItem('rhodes-cognition-terminal-state') ?? '{}');

  expect(persisted.version).toBe(2);
  expect(persisted.state.run.seed).toBeTruthy();
  expect(persisted.state.maze.nodes.length).toBeGreaterThanOrEqual(4);
});

test('resets only the active Run while preserving permanent progression', () => {
  useGameStore.getState().startRun('TEMPORARY-RUN', 'preset', false);
  useGameStore.getState().completeCurrentNode();
  useGameStore.setState({ progression: { firstClear: true, completedRuns: 2 } });

  useGameStore.getState().resetRun();
  const state = useGameStore.getState();

  expect(state.run).toMatchObject({ seed: 'PRESET-RAIN-ECHO', mode: 'preset', phase: 'exploring', turn: 1 });
  expect(state.memoryInventory.fragments).toEqual([]);
  expect(state.progression).toEqual({ firstClear: true, completedRuns: 2 });
  expect(state.ruleLog).toEqual([]);
});

test('applies each Tavern turn once and restores an independent projection per chat', () => {
  const events = projectTavernTurn({
    sessionId: 'chat-rain',
    messageId: 'msg-9',
    summary: '发现儿童意识回声',
    variables: {
      rosmontis_stress: 47,
      memory_node_title: '沉没诊疗层',
      memory_node_risk: 'A',
      clue_title: '被涂改的病历',
    },
    previousVariables: { rosmontis_stress: 39 },
  });

  useGameStore.getState().activateTavernProjection('chat-rain');
  useGameStore.getState().applyTavernEvents(events, 'chat-rain');
  useGameStore.getState().applyTavernEvents(events, 'chat-rain');

  let state = useGameStore.getState();
  expect(state.operators.byId.rosmontis.stress).toBe(47);
  expect(state.memoryMap.nodes.filter((node) => node.sourceMessageId === 'msg-9')).toHaveLength(1);
  expect(state.archive.records.filter((record) => record.sourceMessageId === 'msg-9')).toHaveLength(1);
  expect(state.actionLog.filter((entry) => entry.sourceMessageId === 'msg-9')).toHaveLength(1);

  useGameStore.getState().activateTavernProjection('chat-silent');
  state = useGameStore.getState();
  expect(state.operators.byId.rosmontis.stress).toBe(41);
  expect(state.memoryMap.nodes.some((node) => node.sourceMessageId === 'msg-9')).toBe(false);

  useGameStore.getState().activateTavernProjection('chat-rain');
  state = useGameStore.getState();
  expect(state.operators.byId.rosmontis.stress).toBe(47);
  expect(state.memoryMap.nodes.some((node) => node.sourceMessageId === 'msg-9')).toBe(true);
});

test('reconciles removed history and carries surviving projection into a branch', () => {
  const events = projectTavernTurn({
    sessionId: 'chat-rain',
    messageId: 'msg-9',
    summary: '发现儿童意识回声',
    variables: { rosmontis_stress: 47, clue_title: '被涂改的病历' },
    previousVariables: { rosmontis_stress: 39 },
  });
  useGameStore.getState().activateTavernProjection('chat-rain');
  useGameStore.getState().applyTavernEvents(events, 'chat-rain');
  useGameStore.getState().branchTavernProjection('chat-rain', 'chat-branch', ['msg-9']);
  expect(useGameStore.getState().operators.byId.rosmontis.stress).toBe(47);
  expect(useGameStore.getState().archive.records.some((record) => record.sourceSessionId === 'chat-branch')).toBe(true);

  useGameStore.getState().reconcileTavernProjection('chat-branch', []);
  expect(useGameStore.getState().operators.byId.rosmontis.stress).toBe(41);
  expect(useGameStore.getState().archive.records.some((record) => record.sourceSessionId === 'chat-branch')).toBe(false);
});
