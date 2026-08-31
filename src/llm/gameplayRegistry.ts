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

export function isRegisteredIntent(id: string): id is RegisteredCombatIntentId {
  return intents.has(id);
}
