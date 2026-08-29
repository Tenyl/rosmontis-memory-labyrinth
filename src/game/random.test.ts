import { describe, expect, test } from 'vitest';
import { createSeededRandom, nextRandom, randomInt } from './random';
import type { SeededRandomState } from './types';

function takeFloats(initial: SeededRandomState, count: number) {
  const values: number[] = [];
  let state = initial;
  for (let index = 0; index < count; index += 1) {
    const [value, nextState] = nextRandom(state);
    values.push(value);
    state = nextState;
  }
  return { values, state };
}

describe('seeded roguelike random source', () => {
  test('identical seeds reproduce the same sequence and different seeds diverge', () => {
    const first = takeFloats(createSeededRandom('RSM-04/FLOOR-01'), 12);
    const replay = takeFloats(createSeededRandom('RSM-04/FLOOR-01'), 12);
    const other = takeFloats(createSeededRandom('RSM-04/FLOOR-02'), 12);

    expect(replay).toEqual(first);
    expect(other.values).not.toEqual(first.values);
  });

  test('randomInt stays inside an inclusive integer range', () => {
    let state = createSeededRandom('inclusive-bounds');
    const values: number[] = [];

    for (let index = 0; index < 200; index += 1) {
      const [value, nextState] = randomInt(state, 2, 4);
      values.push(value);
      state = nextState;
    }

    expect(values.every((value) => Number.isInteger(value) && value >= 2 && value <= 4)).toBe(true);
    expect(new Set(values)).toEqual(new Set([2, 3, 4]));
  });

  test('serialized state resumes from the exact next draw', () => {
    const advanced = takeFloats(createSeededRandom('resume-run'), 7).state;
    const restored = JSON.parse(JSON.stringify(advanced)) as SeededRandomState;
    const [expectedValue, expectedState] = randomInt(advanced, 1, 20);
    const [restoredValue, restoredState] = randomInt(restored, 1, 20);

    expect(restoredValue).toBe(expectedValue);
    expect(restoredState).toEqual(expectedState);
    expect(restoredState.draws).toBe(8);
  });

  test('rejects invalid or non-integer bounds without consuming state', () => {
    const state = createSeededRandom('invalid-bounds');

    expect(() => randomInt(state, 5, 4)).toThrow(/范围/);
    expect(() => randomInt(state, 1.5, 4)).toThrow(/整数/);
    expect(state.draws).toBe(0);
  });
});
