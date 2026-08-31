import { describe, expect, test } from 'vitest';
import { resolveGreatswordAction } from './greatswords';
import { createSeededRandom } from './random';
import type { GreatswordCombatState, GreatswordId, GreatswordTarget, MazeNodeType } from './types';

function buildCombatState(): GreatswordCombatState {
  return {
    actionPoints: 4,
    sanity: 80,
    overload: 20,
    guard: 0,
    insight: 0,
    enemyIntegrity: 100,
    coreStability: 0,
    greatswords: {
      breach: { cooldown: 0 },
      watch: { cooldown: 0 },
      perception: { cooldown: 0 },
      resonance: { cooldown: 0 },
    },
  };
}

describe('four greatsword tactics', () => {
  test.each<{
    swordId: GreatswordId;
    target: GreatswordTarget;
    nodeType: MazeNodeType;
    expected: Partial<GreatswordCombatState>;
    ap: number;
    cooldown: number;
    overload: number;
  }>([
    { swordId: 'breach', target: 'hostile', nodeType: 'combat', expected: { enemyIntegrity: 70 }, ap: 2, cooldown: 2, overload: 32 },
    { swordId: 'watch', target: 'self', nodeType: 'combat', expected: { guard: 24 }, ap: 1, cooldown: 1, overload: 25 },
    { swordId: 'perception', target: 'maze', nodeType: 'encounter', expected: { insight: 2 }, ap: 1, cooldown: 2, overload: 27 },
    { swordId: 'resonance', target: 'memory', nodeType: 'boss', expected: { coreStability: 25 }, ap: 2, cooldown: 3, overload: 35 },
  ])('$swordId applies only its configured settlement', ({ swordId, target, nodeType, expected, ap, cooldown, overload }) => {
    const before = buildCombatState();
    const randomState = createSeededRandom(`sword-${swordId}`);
    const resolution = resolveGreatswordAction(before, { swordId, target, nodeType }, randomState);

    expect(resolution.accepted).toBe(true);
    expect(resolution.state).not.toBe(before);
    expect(resolution.state).toMatchObject(expected);
    expect(resolution.state.actionPoints).toBe(4 - ap);
    expect(resolution.state.overload).toBe(overload);
    expect(resolution.state.greatswords[swordId].cooldown).toBe(cooldown);
    expect(resolution.randomState).toEqual(randomState);
    expect(resolution.events).toEqual([{
      type: 'greatsword.used',
      swordId,
      actionPointCost: ap,
      overloadDelta: overload - 20,
      cooldown,
    }]);
    expect(before).toEqual(buildCombatState());
  });

  test.each([
    ['breach', 'self', 'combat'],
    ['perception', 'maze', 'combat'],
    ['resonance', 'memory', 'combat'],
  ] as const)('rejects illegal %s target/node combinations without mutation', (swordId, target, nodeType) => {
    const before = buildCombatState();
    const snapshot = structuredClone(before);
    const randomState = createSeededRandom('illegal-action');
    const resolution = resolveGreatswordAction(before, { swordId, target, nodeType }, randomState);

    expect(resolution.accepted).toBe(false);
    expect(resolution.reason).toMatch(/目标|节点/);
    expect(resolution.state).toBe(before);
    expect(resolution.state).toEqual(snapshot);
    expect(resolution.randomState).toBe(randomState);
    expect(resolution.events).toEqual([]);
  });

  test('rejects cooldown and insufficient AP before changing overload or resources', () => {
    const cooldownState = buildCombatState();
    cooldownState.greatswords.watch.cooldown = 1;
    const lowApState = buildCombatState();
    lowApState.actionPoints = 1;
    const randomState = createSeededRandom('resource-guards');

    const cooldown = resolveGreatswordAction(cooldownState, { swordId: 'watch', target: 'self', nodeType: 'combat' }, randomState);
    const lowAp = resolveGreatswordAction(lowApState, { swordId: 'breach', target: 'hostile', nodeType: 'combat' }, randomState);

    expect(cooldown).toMatchObject({ accepted: false, state: cooldownState, reason: '巨剑仍在冷却中。', events: [] });
    expect(lowAp).toMatchObject({ accepted: false, state: lowApState, reason: '行动点不足。', events: [] });
    expect(cooldownState.overload).toBe(20);
    expect(lowApState.overload).toBe(20);
  });

  test('clamps overload at failure threshold', () => {
    const before = buildCombatState();
    before.overload = 96;

    const resolution = resolveGreatswordAction(
      before,
      { swordId: 'watch', target: 'self', nodeType: 'combat' },
      createSeededRandom('overload-limit'),
    );

    expect(resolution.state.overload).toBe(100);
  });
});
