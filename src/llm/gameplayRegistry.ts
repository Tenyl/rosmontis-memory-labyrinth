import type { MazeNodeType } from '../game/types';

const choices = {
  combat: ['combat-breach', 'combat-guard'],
  'emergency-combat': ['combat-breach', 'combat-guard'],
  safehouse: ['rest-stabilize', 'rest-vent', 'rest-rehearse'],
  shop: ['leave-shop'],
  encounter: ['wonder-observe', 'wonder-anchor', 'wonder-resonate'],
  dilemma: ['dilemma-release-pain', 'dilemma-keep-instinct'],
  unknown: ['unknown-enter'],
  boss: ['boss-breach', 'boss-resonate'],
} satisfies Record<MazeNodeType, string[]>;

const CHOICES = Object.fromEntries(
  Object.entries(choices).map(([type, ids]) => [type, Object.freeze([...ids])]),
) as Record<MazeNodeType, readonly string[]>;

export const REGISTERED_MODIFIER_IDS = Object.freeze([
  'high-threat',
  'overload-surge',
  'reinforced-shield',
  'memory-transmutation',
  'two-phase-core',
] as const);

const MODIFIER_LABELS: Record<typeof REGISTERED_MODIFIER_IDS[number], string> = {
  'high-threat': '高威胁',
  'overload-surge': '过载加剧',
  'reinforced-shield': '强化壁障',
  'memory-transmutation': '记忆蜕变',
  'two-phase-core': '双阶段核心',
};

export const REGISTERED_COMBAT_INTENT_IDS = Object.freeze([
  'assault',
  'charge',
  'erosion',
  'barrier',
] as const);

const modifiers = new Set<string>(REGISTERED_MODIFIER_IDS);
const intents = new Set<string>(REGISTERED_COMBAT_INTENT_IDS);

export type RegisteredCombatIntentId = typeof REGISTERED_COMBAT_INTENT_IDS[number];

export function getAllowedChoiceIds(nodeType: MazeNodeType): readonly string[] {
  return CHOICES[nodeType];
}

export function isRegisteredChoice(nodeType: MazeNodeType, id: string): boolean {
  return CHOICES[nodeType].includes(id);
}

export function isRegisteredModifier(id: string): boolean {
  return modifiers.has(id);
}

export function getModifierLabel(id: string): string {
  return isRegisteredModifier(id)
    ? MODIFIER_LABELS[id as keyof typeof MODIFIER_LABELS]
    : id;
}

export function isRegisteredIntent(id: string): id is RegisteredCombatIntentId {
  return intents.has(id);
}
