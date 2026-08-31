import { clampVital } from './checks';
import { applyBerserkDamage, getOverloadBand } from './overload';
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

export interface GreatswordConfig {
  name: string;
  tacticalRole: string;
  description: string;
  actionPointCost: number;
  cooldown: number;
  overloadDelta: number;
  target: GreatswordTarget;
  nodeTypes: MazeNodeType[];
  effect: { field: EffectField; delta: number };
}

export const GREATSWORD_CONFIG: Record<GreatswordId, GreatswordConfig> = {
  breach: {
    name: '立柱 / 破壁',
    tacticalRole: '破甲粉碎',
    description: '以质量投射粉碎护甲与认知障碍。',
    actionPointCost: 2,
    cooldown: 2,
    overloadDelta: 12,
    target: 'hostile',
    nodeTypes: ['combat', 'emergency-combat', 'boss'],
    effect: { field: 'enemyIntegrity', delta: -30 },
  },
  watch: {
    name: '门扉 / 守望',
    tacticalRole: '实体屏障',
    description: '展开实体屏障，吸收伤害并保护稳定性。',
    actionPointCost: 1,
    cooldown: 1,
    overloadDelta: 5,
    target: 'self',
    nodeTypes: ['combat', 'emergency-combat', 'safehouse', 'shop', 'encounter', 'dilemma', 'unknown', 'boss'],
    effect: { field: 'guard', delta: 24 },
  },
  perception: {
    name: '探针 / 认知',
    tacticalRole: '神经扫描',
    description: '揭示未知节点并洞察敌方弱点。',
    actionPointCost: 1,
    cooldown: 2,
    overloadDelta: 7,
    target: 'maze',
    nodeTypes: ['shop', 'encounter', 'dilemma', 'unknown'],
    effect: { field: 'insight', delta: 2 },
  },
  resonance: {
    name: '哀鸣 / 共鸣',
    tacticalRole: '全域共振',
    description: '稳定深层核心并净化失控的情绪回声。',
    actionPointCost: 2,
    cooldown: 3,
    overloadDelta: 15,
    target: 'memory',
    nodeTypes: ['encounter', 'dilemma', 'unknown', 'boss'],
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
  if (action.swordId === 'perception' && getOverloadBand(state.overload) === 'berserk') {
    return rejected(state, randomState, '暴走时无法维持精细的神经扫描。');
  }
  if (state.greatswords[action.swordId].cooldown > 0) return rejected(state, randomState, '巨剑仍在冷却中。');
  if (state.actionPoints < config.actionPointCost) return rejected(state, randomState, '行动点不足。');

  const effectDelta = config.effect.field === 'enemyIntegrity'
    ? -applyBerserkDamage(Math.abs(config.effect.delta), state.overload)
    : config.effect.delta;
  const effectValue = state[config.effect.field] + effectDelta;
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
