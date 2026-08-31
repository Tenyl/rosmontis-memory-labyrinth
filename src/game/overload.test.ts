import { expect, test } from 'vitest';
import { applyBerserkDamage, getOverloadBand, resolveComfortAction } from './overload';
import type { GreatswordCombatState } from './types';

const combatState: GreatswordCombatState = {
  actionPoints: 4,
  sanity: 100,
  overload: 0,
  guard: 0,
  insight: 0,
  enemyIntegrity: 100,
  coreStability: 0,
  greatswords: {
    breach: { cooldown: 0 }, watch: { cooldown: 0 }, perception: { cooldown: 0 }, resonance: { cooldown: 0 },
  },
};

test('classifies every overload boundary', () => {
  expect([0, 69, 70, 79, 80, 99, 100].map(getOverloadBand)).toEqual([
    'normal', 'normal', 'warning', 'warning', 'berserk', 'berserk', 'collapse',
  ]);
});

test('doubles giant-sword damage only while berserk', () => {
  expect(applyBerserkDamage(30, 79)).toBe(30);
  expect(applyBerserkDamage(30, 80)).toBe(60);
  expect(applyBerserkDamage(30, 99)).toBe(60);
});

test('comfort gestures consume AP and lower overload without mutating the rejected snapshot', () => {
  const touched = resolveComfortAction({ ...combatState, overload: 72 }, 'touch-forehead');
  const held = resolveComfortAction({ ...combatState, overload: 85 }, 'hold-hand');
  const insufficient = { ...combatState, actionPoints: 1, overload: 85 };
  const rejected = resolveComfortAction(insufficient, 'hold-hand');

  expect(touched.state).toMatchObject({ actionPoints: 3, overload: 64 });
  expect(held.state).toMatchObject({ actionPoints: 2, overload: 67 });
  expect(getOverloadBand(held.state.overload)).toBe('normal');
  expect(rejected.accepted).toBe(false);
  expect(rejected.state).toBe(insufficient);
});
