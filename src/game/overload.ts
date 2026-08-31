import { clampVital } from './checks';
import type { ComfortGesture, GreatswordCombatState, OverloadBand, RuleEvent } from './types';

export interface ComfortResolution {
  accepted: boolean;
  reason?: string;
  state: GreatswordCombatState;
  events: RuleEvent[];
}

const COMFORT_CONFIG: Record<ComfortGesture, { actionPointCost: number; overloadReduction: number }> = {
  'touch-forehead': { actionPointCost: 1, overloadReduction: 8 },
  'hold-hand': { actionPointCost: 2, overloadReduction: 18 },
};

export function getOverloadBand(overload: number): OverloadBand {
  if (overload >= 100) return 'collapse';
  if (overload >= 80) return 'berserk';
  if (overload >= 70) return 'warning';
  return 'normal';
}

export function applyBerserkDamage(baseDamage: number, overload: number): number {
  return getOverloadBand(overload) === 'berserk' ? baseDamage * 2 : baseDamage;
}

export function resolveComfortAction(
  state: GreatswordCombatState,
  gesture: ComfortGesture,
): ComfortResolution {
  const config = COMFORT_CONFIG[gesture];
  if (state.actionPoints < config.actionPointCost) {
    return { accepted: false, reason: '行动点不足，迷迭香现在无法回应这次陪伴。', state, events: [] };
  }
  const overload = clampVital(state.overload - config.overloadReduction);
  return {
    accepted: true,
    state: { ...state, actionPoints: state.actionPoints - config.actionPointCost, overload },
    events: [{
      type: 'comfort.used',
      gesture,
      actionPointCost: config.actionPointCost,
      overloadDelta: overload - state.overload,
    }],
  };
}
