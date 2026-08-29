import { randomInt } from './random';
import type {
  D20CheckInput,
  D20CheckResult,
  D20Outcome,
  RuleEvent,
  SeededRandomState,
} from './types';

export interface D20Resolution {
  result: D20CheckResult;
  randomState: SeededRandomState;
  events: RuleEvent[];
}

export function clampVital(value: number) {
  if (!Number.isFinite(value)) {
    throw new TypeError('理智与过载必须是有限数值。');
  }
  return Math.min(100, Math.max(0, value));
}

export function resolveD20Check(
  input: D20CheckInput,
  randomState: SeededRandomState,
): D20Resolution {
  if (!Number.isFinite(input.modifier) || !Number.isFinite(input.difficulty)) {
    throw new TypeError('检定修正与难度必须是有限数值。');
  }

  const [roll, nextRandomState] = randomInt(randomState, 1, 20);
  const total = roll + input.modifier;
  const outcome: D20Outcome = roll === 1
    ? 'critical-failure'
    : roll === 20
      ? 'critical-success'
      : total >= input.difficulty
        ? 'success'
        : 'failure';
  const passed = outcome === 'success' || outcome === 'critical-success';
  const result: D20CheckResult = {
    ...input,
    roll,
    total,
    outcome,
    passed,
  };

  return {
    result,
    randomState: nextRandomState,
    events: [{
      type: 'check.resolved',
      attribute: input.attribute,
      roll,
      total,
      difficulty: input.difficulty,
      outcome,
    }],
  };
}
