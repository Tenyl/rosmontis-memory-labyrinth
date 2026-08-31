import type { MazeNodeType } from './types';
import { NODE_TYPE_NAMES } from './terminology';

export interface DilemmaChoiceDefinition {
  id: string;
  label: string;
  description: string;
  cost: string;
  reward: string;
}

export interface NodeDefinition {
  type: MazeNodeType;
  label: string;
  category: 'combat' | 'recovery' | 'economy' | 'event' | 'unknown' | 'boss';
  rewardTier: 'none' | 'standard' | 'high' | 'boss';
  defaultModifiers: string[];
  combat?: { enemyIntegrity: number; maxRounds: number; rewardEchoes: number };
  dilemmaChoices?: DilemmaChoiceDefinition[];
}

export const NODE_CATALOG: Record<MazeNodeType, NodeDefinition> = {
  combat: {
    type: 'combat', label: NODE_TYPE_NAMES.combat, category: 'combat', rewardTier: 'standard',
    defaultModifiers: [], combat: { enemyIntegrity: 80, maxRounds: 3, rewardEchoes: 8 },
  },
  'emergency-combat': {
    type: 'emergency-combat', label: NODE_TYPE_NAMES['emergency-combat'], category: 'combat', rewardTier: 'high',
    defaultModifiers: ['high-threat', 'overload-surge', 'reinforced-shield'],
    combat: { enemyIntegrity: 120, maxRounds: 4, rewardEchoes: 14 },
  },
  safehouse: {
    type: 'safehouse', label: NODE_TYPE_NAMES.safehouse, category: 'recovery', rewardTier: 'none', defaultModifiers: [],
  },
  shop: {
    type: 'shop', label: NODE_TYPE_NAMES.shop, category: 'economy', rewardTier: 'none', defaultModifiers: [],
  },
  encounter: {
    type: 'encounter', label: NODE_TYPE_NAMES.encounter, category: 'event', rewardTier: 'standard', defaultModifiers: [],
  },
  dilemma: {
    type: 'dilemma', label: NODE_TYPE_NAMES.dilemma, category: 'event', rewardTier: 'high',
    defaultModifiers: ['memory-transmutation'],
    dilemmaChoices: [
      {
        id: 'dilemma-release-pain', label: '放下痛苦记忆', description: '让一段刺痛暂时沉入心海。',
        cost: '放弃本次战术强化', reward: '稳定性 +8，过载 -8',
      },
      {
        id: 'dilemma-keep-instinct', label: '保留战术本能', description: '把危险的本能继续握在手中。',
        cost: '稳定性 -4，过载 +14', reward: '记忆残响 +12',
      },
    ],
  },
  unknown: {
    type: 'unknown', label: NODE_TYPE_NAMES.unknown, category: 'unknown', rewardTier: 'standard', defaultModifiers: [],
  },
  boss: {
    type: 'boss', label: NODE_TYPE_NAMES.boss, category: 'boss', rewardTier: 'boss', defaultModifiers: ['two-phase-core'],
  },
};

export function getNodeDefinition(type: MazeNodeType): NodeDefinition {
  return NODE_CATALOG[type];
}
