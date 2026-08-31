import { expect, test } from 'vitest';
import { createEncounter } from './encounters';
import { resolveEncounterAction, resolveEncounterActionsAtomically } from './encounterProtocol';
import { createRun, reduceRunAction } from './run';
import type { MazeNode, MazeNodeType, RoguelikeState } from './types';

function atNode(type: MazeNodeType): RoguelikeState {
  const state = createRun({
    seed: `PROTOCOL-${type}`,
    mode: 'preset',
    progression: { firstClear: false, completedRuns: 0 },
    llmEnabled: false,
  });
  const node: MazeNode = {
    ...state.maze.nodes[0],
    type,
    hiddenType: type === 'unknown' ? 'combat' : null,
    revealed: type !== 'unknown',
  };
  const withNode = { ...state, maze: { ...state.maze, nodes: [node, ...state.maze.nodes.slice(1)] } };
  return createEncounter({ ...withNode, pendingEncounter: null }, node);
}

test('routes a breach sword card directly into the active combat encounter', () => {
  const before = atNode('combat');

  const result = resolveEncounterAction(before, { type: 'play-sword', swordId: 'breach' });

  expect(result.accepted).toBe(true);
  expect(result.state.pendingEncounter).toMatchObject({ kind: 'combat', enemyIntegrity: 50, round: 1 });
  expect(result.animation).toBe('breach');
});

test('settles a dilemma cost and reward atomically through the same protocol', () => {
  const before = atNode('dilemma');
  const result = resolveEncounterAction(before, { type: 'choose', choiceId: 'dilemma-keep-instinct' });

  expect(result.accepted).toBe(true);
  expect(result.state.pendingEncounter).toMatchObject({ kind: 'encounter', variant: 'dilemma', resolved: true });
  expect(result.state.rosmontis).toMatchObject({ sanity: 96, overload: 14 });
  expect(result.state.economy.echoes).toBe(12);
});

test('keeps a rejected encounter action referentially unchanged', () => {
  const before = atNode('safehouse');
  const result = resolveEncounterAction(before, { type: 'play-sword', swordId: 'breach' });

  expect(result.accepted).toBe(false);
  expect(result.state).toBe(before);
  expect(result.events).toEqual([]);
});

test('exposes the unified encounter protocol through the Run reducer', () => {
  const before = atNode('combat');
  const result = reduceRunAction(before, {
    type: 'resolve-encounter-action',
    action: { type: 'play-sword', swordId: 'breach' },
  });

  expect(result.accepted).toBe(true);
  expect(result.state.pendingEncounter).toMatchObject({ kind: 'combat', enemyIntegrity: 50 });
  expect(result.events).toContainEqual({
    type: 'encounter.action-resolved',
    nodeId: before.run.currentNodeId,
    actionType: 'play-sword',
  });
});

test('berserk doubles breach damage, applies backlash, and blocks precision scanning', () => {
  const combat = { ...atNode('combat'), rosmontis: { ...atNode('combat').rosmontis, overload: 80 } };
  const breached = resolveEncounterAction(combat, { type: 'play-sword', swordId: 'breach' });
  const encounter = { ...atNode('encounter'), rosmontis: { ...atNode('encounter').rosmontis, overload: 80 } };
  const scanned = resolveEncounterAction(encounter, { type: 'play-sword', swordId: 'perception' });

  expect(breached.state.pendingEncounter).toMatchObject({ kind: 'combat', enemyIntegrity: 20 });
  expect(breached.state.rosmontis.sanity).toBe(92);
  expect(scanned.accepted).toBe(false);
  expect(scanned.state).toBe(encounter);
});

test('routes companion comfort through the encounter protocol', () => {
  const before = { ...atNode('combat'), rosmontis: { ...atNode('combat').rosmontis, overload: 85 } };
  const result = resolveEncounterAction(before, { type: 'comfort', gesture: 'hold-hand' });

  expect(result.accepted).toBe(true);
  expect(result.state.rosmontis).toMatchObject({ actionPoints: 2, overload: 67 });
  expect(result.animation).toBe('comfort');
});

test('executes the disclosed enemy intent when the player ends a combat round', () => {
  const before = atNode('combat');
  const spent = {
    ...before,
    rosmontis: {
      ...before.rosmontis,
      actionPoints: 0,
      greatswords: { ...before.rosmontis.greatswords, breach: { cooldown: 1 } },
    },
  };

  const result = resolveEncounterAction(spent, { type: 'recover' });

  expect(result.accepted).toBe(true);
  expect(result.state.rosmontis).toMatchObject({ actionPoints: 4, sanity: 94 });
  expect(result.state.pendingEncounter).toMatchObject({ kind: 'combat', round: 2 });
});

test('rolls back an encounter action sequence when a later action is rejected', () => {
  const before = atNode('combat');
  const result = resolveEncounterActionsAtomically(before, [
    { type: 'play-sword', swordId: 'breach' },
    { type: 'play-sword', swordId: 'breach' },
  ]);

  expect(result.accepted).toBe(false);
  expect(result.state).toBe(before);
  expect(result.events).toEqual([]);
});

test('settles a validated director intent ID with local combat values', () => {
  const before = atNode('combat');
  const planned = {
    ...before,
    rosmontis: { ...before.rosmontis, actionPoints: 0 },
    pendingEncounter: before.pendingEncounter?.kind === 'combat'
      ? { ...before.pendingEncounter, intentPlan: ['erosion' as const] }
      : before.pendingEncounter,
  };
  const result = resolveEncounterAction(planned, { type: 'recover' });

  expect(result.accepted).toBe(true);
  expect(result.state.rosmontis.overload).toBe(20);
});
