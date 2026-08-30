import { describe, expect, test } from 'vitest';

import { createRun } from './run';
import { spendScoutPoint, useExplorationPower } from './exploration';
import type { ExplorationRuleState, GreatswordId } from './types';

function createFixture(): ExplorationRuleState {
  const run = createRun({
    seed: 'EXPLORATION',
    mode: 'preset',
    progression: { firstClear: false, completedRuns: 0 },
    llmEnabled: false,
  });
  const unknown = run.maze.nodes.find((node) => node.type === 'unknown')!;
  const locked = run.maze.edges.find((edge) => edge.locked)!;

  return {
    maze: {
      ...run.maze,
      nodes: run.maze.nodes.map((node) => node.id === unknown.id
        ? { ...node, state: 'reachable' as const }
        : node),
      edges: run.maze.edges.map((edge) => edge.id === locked.id
        ? { ...edge, sourceId: run.run.currentNodeId }
        : edge),
    },
    economy: { echoes: 0, scoutPoints: 1, shopPurchases: [] },
    modules: [],
    explorationCharges: { breach: 1, watch: 1, perception: 1, resonance: 1 },
    routeEffects: {
      nextNodeGuarded: false,
      shopDiscount: 0,
      bossGlitchSuppressed: false,
      resonanceActive: false,
      freeScoutUsed: false,
    },
    currentNodeId: run.run.currentNodeId,
  };
}

describe('greatsword exploration powers', () => {
  test('perception reveals a reachable unknown result and consumes its floor charge', () => {
    const before = createFixture();
    const target = before.maze.nodes.find((node) => node.type === 'unknown')!;
    const result = useExplorationPower(before, { swordId: 'perception', nodeId: target.id });

    expect(result.accepted).toBe(true);
    expect(result.state.maze.nodes.find((node) => node.id === target.id)?.revealed).toBe(true);
    expect(result.state.explorationCharges.perception).toBe(0);
    expect(before.maze.nodes.find((node) => node.id === target.id)?.revealed).toBe(false);
  });

  test('breach opens a locked route from the current node', () => {
    const before = createFixture();
    const edge = before.maze.edges.find((item) => item.locked)!;
    const result = useExplorationPower(before, { swordId: 'breach', edgeId: edge.id });

    expect(result.accepted).toBe(true);
    expect(result.state.maze.edges.find((item) => item.id === edge.id)?.locked).toBe(false);
    expect(result.state.explorationCharges.breach).toBe(0);
  });

  test.each([
    ['watch', 'nextNodeGuarded'],
    ['resonance', 'resonanceActive'],
  ] as const)('%s activates its route effect', (swordId, effect) => {
    const result = useExplorationPower(createFixture(), { swordId });

    expect(result.accepted).toBe(true);
    expect(result.state.routeEffects[effect]).toBe(true);
    expect(result.state.explorationCharges[swordId]).toBe(0);
  });

  test('empty or invalid exploration powers reject without mutation', () => {
    const charged = createFixture();
    const before = {
      ...charged,
      explorationCharges: { ...charged.explorationCharges, perception: 0 as const },
    };
    const target = before.maze.nodes.find((node) => node.type === 'unknown')!;
    const empty = useExplorationPower(before, { swordId: 'perception', nodeId: target.id });
    const invalid = useExplorationPower(charged, { swordId: 'breach', edgeId: 'missing-edge' });

    expect(empty).toMatchObject({ accepted: false, state: before });
    expect(invalid).toMatchObject({ accepted: false, state: charged });
  });

  test('scout points reveal unknown nodes while perception array pays for the first scan', () => {
    const before = createFixture();
    const target = before.maze.nodes.find((node) => node.type === 'unknown')!;
    const paid = spendScoutPoint(before, target.id);
    const equipped = { ...before, modules: ['perception-array' as const] };
    const free = spendScoutPoint(equipped, target.id);

    expect(paid.state.economy.scoutPoints).toBe(0);
    expect(free.state.economy.scoutPoints).toBe(1);
    expect(free.state.routeEffects.freeScoutUsed).toBe(true);
  });
});

