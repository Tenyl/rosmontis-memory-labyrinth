import { describe, expect, test } from 'vitest';

import { createEncounter, resolveEncounterChoice } from './encounters';
import { createRun } from './run';
import type { EncounterRuleState, MazeNode, MazeNodeType } from './types';

function runAtNode(type: MazeNodeType, seed = 'ENCOUNTER-SEED'): EncounterRuleState {
  const base = createRun({
    seed,
    mode: 'preset',
    progression: { firstClear: false, completedRuns: 0 },
    llmEnabled: false,
  });
  const hiddenType = type === 'unknown' ? 'combat' as const : null;
  const node: MazeNode = {
    ...base.maze.nodes[0],
    type,
    risk: type === 'boss' ? 'S' : 'B',
    hiddenType,
    revealed: type !== 'unknown',
    modifiers: type === 'boss' ? ['two-phase-core'] : [],
  };

  return {
    ...base,
    maze: { ...base.maze, nodes: [node, ...base.maze.nodes.slice(1)] },
    economy: { echoes: 20, scoutPoints: 1, shopPurchases: [] },
    modules: [],
    routeEffects: {
      nextNodeGuarded: false,
      shopDiscount: 0,
      bossGlitchSuppressed: false,
      resonanceActive: false,
      freeScoutUsed: false,
    },
    pendingEncounter: null,
  };
}

describe('node encounters', () => {
  test.each(['combat', 'emergency-combat', 'safehouse', 'shop', 'encounter', 'dilemma', 'unknown', 'boss'] as const)(
    'creates a deterministic %s encounter',
    (type) => {
      const before = runAtNode(type);
      const node = before.maze.nodes[0];
      const expectedKind = type === 'emergency-combat'
        ? 'combat'
        : type === 'dilemma'
          ? 'encounter'
          : type;

      expect(createEncounter(before, node)).toEqual(createEncounter(before, node));
      expect(createEncounter(before, node).pendingEncounter).toMatchObject({ kind: expectedKind, nodeId: node.id });
    },
  );

  test('combat advances rounds and grants module-adjusted echoes on victory', () => {
    let state = createEncounter(
      { ...runAtNode('combat'), modules: ['breach-circuit', 'echo-recycler'] },
      runAtNode('combat').maze.nodes[0],
    );
    state = resolveEncounterChoice(state, 'combat-breach').state;
    const victory = resolveEncounterChoice(state, 'combat-breach');

    expect(victory.accepted).toBe(true);
    expect(victory.state.pendingEncounter).toMatchObject({ kind: 'combat', resolved: true, enemyIntegrity: 0 });
    expect(victory.state.economy.echoes).toBe(31);
  });

  test('rest allows exactly one recovery choice', () => {
    const before = runAtNode('safehouse');
    const active = createEncounter({ ...before, rosmontis: { ...before.rosmontis, sanity: 60 } }, before.maze.nodes[0]);
    const rested = resolveEncounterChoice(active, 'rest-stabilize');
    const repeated = resolveEncounterChoice(rested.state, 'rest-vent');

    expect(rested.state.rosmontis.sanity).toBe(80);
    expect(rested.state.pendingEncounter).toMatchObject({ resolved: true });
    expect(repeated.accepted).toBe(false);
  });

  test('shop purchases delegate to economy rules and can then be left', () => {
    const before = runAtNode('shop');
    const active = createEncounter(before, before.maze.nodes[0]);
    const encounter = active.pendingEncounter;
    if (!encounter || encounter.kind !== 'shop') throw new Error('shop encounter expected');
    const offer = encounter.offers[0];
    const purchased = resolveEncounterChoice(active, `buy:${offer.id}`);
    const left = resolveEncounterChoice(purchased.state, 'leave-shop');

    expect(purchased.accepted).toBe(true);
    expect(purchased.state.modules).toContain(offer.moduleId);
    expect(left.state.pendingEncounter).toMatchObject({ kind: 'shop', resolved: true });
  });

  test('wonder fragment keys and resonance choices stay locally locked', () => {
    const before = runAtNode('encounter');
    const active = createEncounter(before, before.maze.nodes[0]);
    const locked = resolveEncounterChoice(active, 'wonder-anchor');
    const withKey = {
      ...active,
      memoryInventory: {
        ...active.memoryInventory,
        fragments: [{ id: 'rain', name: '雨声', kind: 'skill' as const, tags: ['感知'] }],
      },
    };

    expect(locked.accepted).toBe(false);
    expect(resolveEncounterChoice(withKey, 'wonder-anchor').accepted).toBe(true);
    expect(resolveEncounterChoice(active, 'wonder-resonate').accepted).toBe(false);
  });

  test('unknown keeps its generated result, flags overload risk, and pays direct-entry compensation', () => {
    const low = runAtNode('unknown');
    const high = { ...low, rosmontis: { ...low.rosmontis, overload: 75 } };
    const lowEncounter = createEncounter(low, low.maze.nodes[0]);
    const highEncounter = createEncounter(high, high.maze.nodes[0]);
    const entered = resolveEncounterChoice(lowEncounter, 'unknown-enter');

    expect(lowEncounter.pendingEncounter).toMatchObject({ hiddenType: 'combat', glitch: false });
    expect(highEncounter.pendingEncounter).toMatchObject({ hiddenType: 'combat', glitch: true });
    expect(entered.state.economy.echoes).toBeGreaterThan(low.economy.echoes);
  });

  test('the fifth-floor boss uses shield and reconciliation phases with a high-overload glitch', () => {
    const initial = runAtNode('boss');
    const before = { ...initial, run: { ...initial.run, floor: 5, maxFloor: 5 } };
    let state = createEncounter(
      { ...before, modules: ['breach-circuit', 'resonance-wire'], rosmontis: { ...before.rosmontis, overload: 75 } },
      before.maze.nodes[0],
    );
    state = resolveEncounterChoice(state, 'boss-breach').state;
    state = resolveEncounterChoice(state, 'boss-breach').state;

    expect(state.pendingEncounter).toMatchObject({ kind: 'boss', bossKind: 'closed-heart', phase: 'reconciliation', glitch: true });
    state = resolveEncounterChoice(state, 'boss-resonate').state;
    state = resolveEncounterChoice(state, 'boss-resonate').state;
    state = resolveEncounterChoice(state, 'boss-resonate').state;

    expect(state.pendingEncounter).toMatchObject({ kind: 'boss', resolved: true, coreStability: 100 });
  });
});
