import { describe, expect, test } from 'vitest';
import { clampVital, resolveD20Check } from './checks';
import { createSeededRandom, randomInt } from './random';

function seedForRoll(target: number) {
  for (let index = 0; index < 20_000; index += 1) {
    const seed = `d20-${target}-${index}`;
    const [roll] = randomInt(createSeededRandom(seed), 1, 20);
    if (roll === target) return seed;
  }
  throw new Error(`Unable to find deterministic seed for D20 roll ${target}`);
}

describe('D20 checks', () => {
  test('natural 1 is a critical failure even with a large modifier', () => {
    const resolution = resolveD20Check(
      { attribute: '共鸣', modifier: 99, difficulty: 2 },
      createSeededRandom(seedForRoll(1)),
    );

    expect(resolution.result).toMatchObject({ roll: 1, total: 100, outcome: 'critical-failure', passed: false });
    expect(resolution.events[0]).toMatchObject({ type: 'check.resolved', outcome: 'critical-failure' });
  });

  test('natural 20 is a critical success even above the numeric total', () => {
    const resolution = resolveD20Check(
      { attribute: '感知', modifier: -5, difficulty: 99 },
      createSeededRandom(seedForRoll(20)),
    );

    expect(resolution.result).toMatchObject({ roll: 20, total: 15, outcome: 'critical-success', passed: true });
  });

  test('a modified total equal to difficulty passes', () => {
    const seed = seedForRoll(12);
    const resolution = resolveD20Check(
      { attribute: '破壁', modifier: 3, difficulty: 15 },
      createSeededRandom(seed),
    );

    expect(resolution.result).toEqual({
      attribute: '破壁',
      roll: 12,
      modifier: 3,
      total: 15,
      difficulty: 15,
      outcome: 'success',
      passed: true,
    });
  });

  test('the same random state reproduces the full resolution', () => {
    const state = createSeededRandom('replay-check');
    const input = { attribute: '守望', modifier: 2, difficulty: 14 };

    expect(resolveD20Check(input, state)).toEqual(resolveD20Check(input, state));
  });
});

describe('bounded Rosmontis vitals', () => {
  test.each([
    [-7, 0],
    [0, 0],
    [42.5, 42.5],
    [100, 100],
    [148, 100],
  ])('clamps %s to %s', (value, expected) => {
    expect(clampVital(value)).toBe(expected);
  });

  test('rejects non-finite vital values', () => {
    expect(() => clampVital(Number.NaN)).toThrow(/有限数值/);
    expect(() => clampVital(Number.POSITIVE_INFINITY)).toThrow(/有限数值/);
  });
});
