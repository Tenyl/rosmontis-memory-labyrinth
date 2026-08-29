import type { SeededRandomState } from './types';

const UINT32_SIZE = 4_294_967_296;
const STEP = 0x6d2b79f5;

function hashSeed(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRandom(seed: string): SeededRandomState {
  return {
    seed,
    cursor: hashSeed(seed),
    draws: 0,
  };
}

export function nextRandom(state: SeededRandomState): [number, SeededRandomState] {
  const cursor = (state.cursor + STEP) >>> 0;
  let value = cursor;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  const normalized = ((value ^ (value >>> 14)) >>> 0) / UINT32_SIZE;

  return [
    normalized,
    {
      seed: state.seed,
      cursor,
      draws: state.draws + 1,
    },
  ];
}

export function randomInt(
  state: SeededRandomState,
  min: number,
  max: number,
): [number, SeededRandomState] {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new TypeError('随机整数范围必须使用整数边界。');
  }
  if (min > max) {
    throw new RangeError('随机整数范围的最小值不能大于最大值。');
  }

  const [value, nextState] = nextRandom(state);
  return [min + Math.floor(value * (max - min + 1)), nextState];
}
