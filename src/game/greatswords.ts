import { clampVital } from './checks';
import type {
  GreatswordAction,
  GreatswordCombatState,
  GreatswordId,
  GreatswordTarget,
  MazeNodeType,
  RuleEvent,
  SeededRandomState,
} from './types';

type EffectField = 'enemyIntegrity' | 'guard' | 'insight' | 'coreStability';

interface GreatswordConfig {
  actionPointCost: number;
  cooldown: number;
  overloadDelta: number;
  target: GreatswordTarget;
  nodeTypes: MazeNodeType[];
  effect: { field: EffectField; delta: number };
}

export const GREATSWORD_CONFIG: Record<GreatswordId, GreatswordConfig> = {
  breach: {
    actionPointCost: 2,
    cooldown: 2,
    overloadDelta: 12,
    target: 'hostile',
    nodeTypes: ['echo-combat'],
    effect: { field: 'enemyIntegrity', delta: -30 },
  },
  watch: {
    actionPointCost: 1,
    cooldown: 1,
    overloadDelta: 5,
    target: 'self',
    nodeTypes: ['echo-combat', 'blank-event', 'thought-rest', 'memory-core'],
    effect: { field: 'guard', delta: 24 },
  },
  perception: {
    actionPointCost: 1,
    cooldown: 2,
    overloadDelta: 7,
    target: 'maze',
    nodeTypes: ['blank-event'],
    effect: { field: 'insight', delta: 2 },
  },
  resonance: {
    actionPointCost: 2,
    cooldown: 3,
    overloadDelta: 15,
    target: 'memory',
    nodeTypes: ['memory-core'],
    effect: { field: 'coreStability', delta: 25 },
  },
};

export interface GreatswordResolution {
  accepted: boolean;
  reason?: string;
  state: GreatswordCombatState;
  randomState: SeededRandomState;
  events: RuleEvent[];
}

export function resolveGreatswordAction(
  state: GreatswordCombatState,
  action: GreatswordAction,
  randomState: SeededRandomState,
): GreatswordResolution {
  const config = GREATSWORD_CONFIG[action.swordId];
  if (action.target !== config.target) return rejected(state, randomState, '技能目标不合法。');
  if (!config.nodeTypes.includes(action.nodeType)) return rejected(state, randomState, '当前节点不能使用该技能。');
  if (state.greatswords[action.swordId].cooldown > 0) return rejected(state, randomState, '巨剑仍在冷却中。');
  if (state.actionPoints < config.actionPointCost) return rejected(state, randomState, '行动点不足。');

  const effectValue = state[config.effect.field] + config.effect.delta;
  const nextState: GreatswordCombatState = {
    ...state,
    actionPoints: state.actionPoints - config.actionPointCost,
    overload: clampVital(state.overload + config.overloadDelta),
    [config.effect.field]: config.effect.field === 'insight'
      ? Math.max(0, effectValue)
      : clampVital(effectValue),
    greatswords: {
      ...state.greatswords,
      [action.swordId]: { cooldown: config.cooldown },
    },
  };
  const event: RuleEvent = {
    type: 'greatsword.used',
    swordId: action.swordId,
    actionPointCost: config.actionPointCost,
    overloadDelta: config.overloadDelta,
    cooldown: config.cooldown,
  };
  return { accepted: true, state: nextState, randomState, events: [event] };
}

function rejected(
  state: GreatswordCombatState,
  randomState: SeededRandomState,
  reason: string,
): GreatswordResolution {
  return { accepted: false, reason, state, randomState, events: [] };
}
