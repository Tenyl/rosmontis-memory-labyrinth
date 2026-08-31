import { buildDemoState } from '../data/demoData';
import { projectTavernTurn } from '../features/tavern/projection/tavern-turn-projector';
import type { MemoryFragment } from '../game/types';
import { LocalContentDriver } from '../llm/contentDriver';
import { sanitizeSingleProtagonistState, useGameStore } from './gameStore';

beforeEach(() => {
  useGameStore.getState().resetDemoState();
});

test('starts with the current maze workspace and no legacy archive domains', () => {
  const state = buildDemoState();

  expect(state.maze.nodes.length).toBeGreaterThan(0);
  expect(state.ui.mazeViewMode).toBe('graph');
  expect(state).not.toHaveProperty('memoryMap');
  expect(state).not.toHaveProperty('archive');
  expect(state).not.toHaveProperty('actionLog');
});

test('resets mutated stress and UI maze preference', () => {
  useGameStore.getState().setOperatorStress('rosmontis', 57);
  useGameStore.getState().setMazeView('list');

  useGameStore.getState().resetDemoState();

  expect(useGameStore.getState().operators.byId.rosmontis.stress).toBe(41);
  expect(useGameStore.getState().ui.mazeViewMode).toBe('graph');
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
  useGameStore.getState().resolveEncounterChoice('rest-rehearse');
  useGameStore.getState().moveToNode(target);
  state = useGameStore.getState();

  expect(state.run.currentNodeId).toBe(target);
  expect(state.ruleLog.at(-1)).toMatchObject({ type: 'run.moved', targetNodeId: target });
});

test('dispatches a Run action as one atomic cross-slice transaction and leaves rejected snapshots untouched', () => {
  useGameStore.getState().startRun('ATOMIC-RUN', 'preset', false);
  useGameStore.getState().useGreatsword({ swordId: 'watch', target: 'self', nodeType: 'safehouse' });
  useGameStore.getState().resolveEncounterChoice('rest-rehearse');
  const before = useGameStore.getState();
  const target = before.maze.edges.find((edge) => edge.sourceId === before.run.currentNodeId && !edge.locked)!.targetId;

  const accepted = (before as any).dispatchRunAction({ type: 'move-to-node', nodeId: target });
  const after = useGameStore.getState();

  expect(accepted.accepted).toBe(true);
  expect(after.run).toMatchObject({ currentNodeId: target, turn: before.run.turn + 1 });
  expect(after.rosmontis.actionPoints).toBe(4);
  expect(after.maze.nodes.find((node) => node.id === target)?.state).toBe('current');
  expect(after.pendingEncounter?.nodeId).toBe(target);
  expect(after.ruleLog.at(-1)).toMatchObject({ type: 'run.moved', targetNodeId: target });

  const snapshot = useGameStore.getState();
  const rejected = (snapshot as any).dispatchRunAction({ type: 'move-to-node', nodeId: 'missing-node' });
  expect(rejected.accepted).toBe(false);
  expect(useGameStore.getState()).toBe(snapshot);
});

test('persists encounter, economy, modules, and exploration actions through store adapters', () => {
  useGameStore.getState().startRun('STORE-INTEGRATED', 'preset', false);
  let state = useGameStore.getState();

  expect(state.pendingEncounter).toMatchObject({ kind: 'safehouse', resolved: false });
  useGameStore.getState().resolveEncounterChoice('rest-rehearse');
  state = useGameStore.getState();
  expect(state.economy.scoutPoints).toBe(2);

  useGameStore.getState().useExplorationPower({ swordId: 'watch' });
  state = useGameStore.getState();
  expect(state.explorationCharges.watch).toBe(0);
  expect(state.routeEffects.nextNodeGuarded).toBe(true);

  useGameStore.setState((current) => ({
    economy: { ...current.economy, echoes: 30 },
    pendingEncounter: {
      kind: 'shop',
      nodeId: current.run.currentNodeId,
      resolved: false,
      offers: [{ id: 'store-offer', kind: 'module', moduleId: 'overload-filter', price: 10 }],
      choices: [{ id: 'leave-shop', label: '离开', description: '结束交易。' }],
    },
  }));
  useGameStore.getState().purchaseShopOffer('store-offer');

  expect(useGameStore.getState().modules).toContain('overload-filter');
  expect(useGameStore.getState().economy.echoes).toBe(20);
});

test('binds director requests to the active Run and settles event intent through local rules', () => {
  useGameStore.getState().startRun('DIRECTOR-RUN', 'preset', true);
  const token = useGameStore.getState().beginDirectorRequest('event', 'node-trigger');
  useGameStore.getState().markDirectorTriggerHandled('event:node-trigger');
  useGameStore.getState().acceptDirectorEvent(token, 'node-trigger', {
    title: '逆流雨幕',
    situation: '雨滴带走倒影。',
    choices: [
      { id: 'scan-rain', label: '读取雨声', description: '确认记忆残留。', intent: 'scan' },
      { id: 'hold-line', label: '守住边界', description: '拒绝异常靠近。', intent: 'guard' },
    ],
  }, 'remote');

  expect(useGameStore.getState().llmDirector).toMatchObject({
    runId: useGameStore.getState().run.id,
    handledTriggers: ['event:node-trigger'],
    event: { triggerKey: 'node-trigger', source: 'remote', resolvedChoiceId: null },
  });

  useGameStore.getState().resolveDirectorChoice('scan-rain');
  expect(useGameStore.getState().rosmontis).toMatchObject({ sanity: 99, overload: 7 });
  expect(useGameStore.getState().llmDirector.event?.resolvedChoiceId).toBe('scan-rain');
});

test('persists one shared node presentation through the director store', () => {
  useGameStore.getState().startRun('PRESENTATION-RUN', 'preset', false);
  const state = useGameStore.getState();
  const node = state.maze.nodes.find((item) => item.id === state.run.currentNodeId)!;
  const presentation = new LocalContentDriver().resolveNode({ run: state.run, node });

  useGameStore.getState().acceptNodePresentation(presentation);

  expect(useGameStore.getState().llmDirector.presentations[`${state.run.id}:${node.id}`]).toEqual(presentation);
});

test('rejects stale director responses and resets director content for a new Run', () => {
  useGameStore.getState().startRun('DIRECTOR-OLD', 'preset', true);
  const staleToken = useGameStore.getState().beginDirectorRequest('quote', 'rule-1');
  useGameStore.getState().startRun('DIRECTOR-NEW', 'preset', true);

  useGameStore.getState().acceptDirectorQuote(staleToken, 'rule-1', { text: '我还在旧的记忆里。' }, 'remote');

  const state = useGameStore.getState();
  expect(state.llmDirector.runId).toBe(state.run.id);
  expect(state.llmDirector.quote).toBeNull();
  expect(state.llmDirector.handledTriggers).toEqual([]);
});

test('settles greatswords through pure rules and synchronizes the status-page adapter', () => {
  useGameStore.getState().startRun('STORE-SWORD', 'preset', false);
  useGameStore.getState().useGreatsword({ swordId: 'watch', target: 'self', nodeType: 'safehouse' });
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
      fragments: [{ id: 'kept', name: '保留记忆', kind: 'emotion', tags: [] }],
      pendingFragment: { id: 'pending', name: '待选记忆', kind: 'pain', tags: [] },
    },
  }));

  useGameStore.getState().resolveFragmentChoice({ type: 'transcribe-and-replace', fragmentId: 'kept' });
  const state = useGameStore.getState();

  expect(state.run.phase).toBe('exploring');
  expect(state.memoryInventory.fragments.map((fragment) => fragment.id)).toEqual(['pending']);
  expect(state.memoryInventory.pendingFragment).toBeNull();
  expect(state.pendingDiaryDrafts).toContainEqual(expect.objectContaining({
    id: 'diary-transcription-kept',
    triggerKey: 'fragment-transcribed:kept',
  }));
});

test('completes the current node through rules and blocks the Run on fragment overflow', () => {
  const reward: MemoryFragment = {
    id: 'fragment-store-overflow',
    name: '走廊尽头的雨声',
    kind: 'skill',
    tags: ['雨声'],
  };
  useGameStore.getState().startRun('STORE-NODE-REWARD', 'preset', false);
  useGameStore.setState((state) => ({
    memoryInventory: {
      ...state.memoryInventory,
      capacity: 1,
      fragments: [{ id: 'fragment-kept', name: '仍被记住的名字', kind: 'emotion', tags: ['名字'] }],
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
    run: { ...state.run, floor: 3, maxFloor: 3, currentNodeId: state.maze.coreNodeId },
    rosmontis: { ...state.rosmontis, coreStability: 100 },
    maze: {
      ...state.maze,
      floor: 3,
      maxFloor: 3,
      nodes: state.maze.nodes.map((node) => ({
        ...node,
        type: node.id === state.maze.coreNodeId ? 'boss' as const : node.type,
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
  expect(state.runHistory.at(-1)).toMatchObject({
    runId: state.run.id,
    seed: 'STORE-FIRST-CLEAR',
    mode: 'preset',
    result: 'victory',
    finalSanity: 100,
  });
  expect(state.pendingDiaryDrafts).toContainEqual(expect.objectContaining({
    triggerKey: `floor-completed:${state.run.id}:3`,
    runId: state.run.id,
    floor: 3,
  }));
  useGameStore.getState().resetRun();
  expect(useGameStore.getState().pendingDiaryDrafts.some((draft) => draft.id === state.pendingDiaryDrafts.at(-1)!.id)).toBe(true);
  const draftId = state.pendingDiaryDrafts.at(-1)!.id;
  useGameStore.getState().acknowledgeDiaryDraft(draftId);
  expect(useGameStore.getState().pendingDiaryDrafts.some((draft) => draft.id === draftId)).toBe(false);
});

test('adds recovered fragments to the permanent memory compendium', () => {
  const reward: MemoryFragment = {
    id: 'fragment-compendium',
    name: '雨幕中的病历页',
    kind: 'emotion',
    tags: ['病区', '雨声'],
  };
  useGameStore.getState().startRun('STORE-COMPENDIUM', 'preset', false);
  useGameStore.getState().completeCurrentNode(reward);
  const state = useGameStore.getState();
  const acquired = state.memoryInventory.fragments[0];

  expect(acquired).toBeDefined();
  expect(state.memoryCompendium).toContainEqual(expect.objectContaining({
    id: acquired.id,
    name: acquired.name,
    kind: acquired.kind,
    discoveredRunId: state.run.id,
    discoveries: 1,
  }));
});

test('persists the explicit roguelike schema version', () => {
  useGameStore.getState().setOperatorStress('rosmontis', 44);
  const persisted = JSON.parse(localStorage.getItem('rhodes-cognition-terminal-state') ?? '{}');

  expect(persisted.version).toBe(9);
  expect(persisted.state.run.seed).toBeTruthy();
  expect(persisted.state.maze.nodes.length).toBeGreaterThanOrEqual(9);
  expect(persisted.state.runHistory).toEqual(expect.any(Array));
  expect(persisted.state.memoryCompendium).toEqual(expect.any(Array));
  expect(persisted.state).not.toHaveProperty('memoryMap');
  expect(persisted.state).not.toHaveProperty('archive');
  expect(persisted.state).not.toHaveProperty('actionLog');
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
  expect(state.tavernProjection.sessions['chat-rain']?.processedMessageIds).toEqual(['msg-9']);

  useGameStore.getState().activateTavernProjection('chat-silent');
  state = useGameStore.getState();
  expect(state.operators.byId.rosmontis.stress).toBe(41);

  useGameStore.getState().activateTavernProjection('chat-rain');
  state = useGameStore.getState();
  expect(state.operators.byId.rosmontis.stress).toBe(47);
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
  expect(useGameStore.getState().tavernProjection.sessions['chat-branch']?.processedMessageIds).toEqual(['msg-9']);

  useGameStore.getState().reconcileTavernProjection('chat-branch', []);
  expect(useGameStore.getState().operators.byId.rosmontis.stress).toBe(41);
  expect(useGameStore.getState().tavernProjection.sessions['chat-branch']?.processedMessageIds).toEqual([]);
});
