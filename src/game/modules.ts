import type { CognitiveModule, ModuleId } from './types';

export type ModuleEffectContext =
  | { type: 'breach-damage'; value: number }
  | { type: 'opening-guard'; value: number }
  | { type: 'scout-cost'; value: number }
  | { type: 'resonance-stability'; value: number }
  | { type: 'movement-overload'; value: number }
  | { type: 'fragment-capacity'; value: number }
  | { type: 'combat-echoes'; value: number }
  | { type: 'unknown-penalty'; value: number };

export const MODULE_CATALOG: readonly CognitiveModule[] = [
  {
    id: 'breach-circuit',
    name: '破壁回路',
    rarity: 'common',
    description: '破壁巨剑造成的结构伤害提高 10 点。',
  },
  {
    id: 'watch-prism',
    name: '守望棱镜',
    rarity: 'common',
    description: '进入战斗时获得 12 点防护。',
  },
  {
    id: 'perception-array',
    name: '感知阵列',
    rarity: 'rare',
    description: '每层首次侦测未知节点不消耗侦测点。',
  },
  {
    id: 'resonance-wire',
    name: '共鸣导线',
    rarity: 'common',
    description: '共鸣巨剑的核心稳定效果提高 10 点。',
  },
  {
    id: 'overload-filter',
    name: '降载滤波器',
    rarity: 'common',
    description: '节点移动引发的过载增加降低 3 点。',
  },
  {
    id: 'memory-cache',
    name: '记忆缓存',
    rarity: 'rare',
    description: '普通记忆碎片容量增加 1 格。',
  },
  {
    id: 'echo-recycler',
    name: '残响回收器',
    rarity: 'common',
    description: '战斗结算时额外获得 3 点记忆残响。',
  },
  {
    id: 'white-noise',
    name: '白噪声协议',
    rarity: 'rare',
    description: '未知陷阱造成的负面数值降低约一半。',
  },
] as const;

const MODULE_EFFECTS: Record<ModuleId, {
  context: ModuleEffectContext['type'];
  apply: (value: number) => number;
}> = {
  'breach-circuit': { context: 'breach-damage', apply: (value) => value + 10 },
  'watch-prism': { context: 'opening-guard', apply: (value) => value + 12 },
  'perception-array': { context: 'scout-cost', apply: () => 0 },
  'resonance-wire': { context: 'resonance-stability', apply: (value) => value + 10 },
  'overload-filter': { context: 'movement-overload', apply: (value) => Math.max(0, value - 3) },
  'memory-cache': { context: 'fragment-capacity', apply: (value) => value + 1 },
  'echo-recycler': { context: 'combat-echoes', apply: (value) => value + 3 },
  'white-noise': { context: 'unknown-penalty', apply: (value) => Math.ceil(value / 2) },
};

export function applyModuleEffect(
  moduleIds: readonly ModuleId[],
  context: ModuleEffectContext,
): number {
  let value = context.value;
  for (const moduleId of new Set(moduleIds)) {
    const effect = MODULE_EFFECTS[moduleId];
    if (effect.context === context.type) value = effect.apply(value);
  }
  return value;
}

export function getModule(moduleId: ModuleId): CognitiveModule {
  const module = MODULE_CATALOG.find((item) => item.id === moduleId);
  if (!module) throw new RangeError(`未知认知模块：${moduleId}。`);
  return module;
}
