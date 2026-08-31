export type CombatIntentType = 'assault' | 'charge' | 'erosion' | 'barrier';

export interface CombatIntent {
  type: CombatIntentType;
  label: string;
  description: string;
  damage: number;
  overload: number;
  guard: number;
  interruptible: boolean;
}

const INTENTS: CombatIntent[] = [
  { type: 'assault', label: '强攻', description: '下一轮发动连续物理冲击。', damage: 14, overload: 0, guard: 0, interruptible: false },
  { type: 'charge', label: '蓄力', description: '高额伤害正在聚集；削减硬直可打断。', damage: 28, overload: 0, guard: 0, interruptible: true },
  { type: 'erosion', label: '精神侵蚀', description: '神经噪声将抬高精神过载。', damage: 5, overload: 22, guard: 0, interruptible: false },
  { type: 'barrier', label: '绝对壁障', description: '残响实体将重构防护立场。', damage: 0, overload: 0, guard: 26, interruptible: false },
];

export function getCombatIntent(
  round: number,
  emergency: boolean,
  plan?: readonly CombatIntentType[],
): CombatIntent {
  const plannedType = plan?.length ? plan[Math.max(0, round - 1) % plan.length] : null;
  const base = (plannedType ? INTENTS.find((intent) => intent.type === plannedType) : null)
    ?? INTENTS[Math.max(0, round - 1) % INTENTS.length];
  const multiplier = emergency ? 1.35 : 1;
  return {
    ...base,
    damage: Math.ceil(base.damage * multiplier),
    overload: base.overload,
    guard: Math.ceil(base.guard * multiplier),
  };
}
