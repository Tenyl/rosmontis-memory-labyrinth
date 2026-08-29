import { deepMemoryClue, buildDemoState } from '../data/demoData';
import { projectTavernTurn } from '../features/tavern/projection/tavern-turn-projector';
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
