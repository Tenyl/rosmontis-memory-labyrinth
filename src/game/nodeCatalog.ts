import type { MazeNodeType } from './types';

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
    type: 'combat', label: '常规作战', category: 'combat', rewardTier: 'standard',
    defaultModifiers: [], combat: { enemyIntegrity: 80, maxRounds: 3, rewardEchoes: 8 },
  },
  'emergency-combat': {
    type: 'emergency-combat', label: '紧急作战', category: 'combat', rewardTier: 'high',
    defaultModifiers: ['high-threat', 'overload-surge', 'reinforced-shield'],
    combat: { enemyIntegrity: 120, maxRounds: 4, rewardEchoes: 14 },
  },
  safehouse: {
    type: 'safehouse', label: '休息处 / 安全屋', category: 'recovery', rewardTier: 'none', defaultModifiers: [],
  },
  shop: {
    type: 'shop', label: '认知黑市 / 商店', category: 'economy', rewardTier: 'none', defaultModifiers: [],
  },
  encounter: {
    type: 'encounter', label: '不期而遇 / 奇境', category: 'event', rewardTier: 'standard', defaultModifiers: [],
  },
  dilemma: {
    type: 'dilemma', label: '命运抉择', category: 'event', rewardTier: 'high',
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
    type: 'unknown', label: '未知', category: 'unknown', rewardTier: 'standard', defaultModifiers: [],
  },
  boss: {
    type: 'boss', label: '领袖之敌 / Boss', category: 'boss', rewardTier: 'boss', defaultModifiers: ['two-phase-core'],
  },
};

export function getNodeDefinition(type: MazeNodeType): NodeDefinition {
  return NODE_CATALOG[type];
}
