import type { GreatswordId, MazeNodeType, MemoryFragmentKind } from './types';

export const GREATSWORD_NAMES: Record<GreatswordId, string> = {
  breach: '破壁',
  watch: '守望',
  perception: '认知',
  resonance: '共鸣',
};

export const NODE_TYPE_NAMES: Record<MazeNodeType, string> = {
  combat: '常规作战',
  'emergency-combat': '紧急作战',
  safehouse: '安全屋',
  shop: '认知黑市',
  encounter: '奇境',
  dilemma: '命运抉择',
  unknown: '未知',
  boss: '领袖之敌',
};

export const FRAGMENT_KIND_NAMES: Record<Exclude<MemoryFragmentKind, 'core'>, string> = {
  emotion: '情感碎片',
  pain: '痛苦碎片',
  skill: '技能碎片',
};

export const COMPANION_INTERACTION_NAME = '陪伴交互';
