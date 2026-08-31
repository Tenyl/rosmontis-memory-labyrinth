import type { FloorDefinition, RunEra } from './types';

const STANDARD_REQUIRED_TYPES = [
  'combat',
  'safehouse',
  'shop',
  'encounter',
  'unknown',
] as const;

const ADVANCED_REQUIRED_TYPES = [
  'combat',
  'emergency-combat',
  'safehouse',
  'shop',
  'encounter',
  'dilemma',
  'unknown',
] as const;

export const STANDARD_FLOORS: readonly FloorDefinition[] = [
  {
    floor: 1,
    title: '表层残响',
    era: 'trauma-recovery',
    bossKind: 'gatekeeper',
    requiredNodeTypes: [...STANDARD_REQUIRED_TYPES],
    targetNodeRange: [9, 11],
  },
  {
    floor: 2,
    title: '雨幕病区',
    era: 'trauma-recovery',
    bossKind: 'gatekeeper',
    requiredNodeTypes: [...ADVANCED_REQUIRED_TYPES],
    targetNodeRange: [10, 12],
  },
  {
    floor: 3,
    title: '冰冷实验室',
    era: 'trauma-recovery',
    bossKind: 'gatekeeper',
    requiredNodeTypes: [...ADVANCED_REQUIRED_TYPES],
    targetNodeRange: [10, 13],
  },
  {
    floor: 4,
    title: '心防回廊',
    era: 'trauma-recovery',
    bossKind: 'gatekeeper',
    requiredNodeTypes: [...ADVANCED_REQUIRED_TYPES],
    targetNodeRange: [11, 13],
  },
  {
    floor: 5,
    title: '核心花房',
    era: 'trauma-recovery',
    bossKind: 'closed-heart',
    requiredNodeTypes: [...ADVANCED_REQUIRED_TYPES],
    targetNodeRange: [11, 13],
  },
] as const;

export function getRunEra(floor: number): RunEra {
  assertFloor(floor);
  return floor <= STANDARD_FLOORS.length ? 'trauma-recovery' : 'boundless-mindsea';
}

export function getFloorDefinition(floor: number): FloorDefinition {
  assertFloor(floor);
  const standard = STANDARD_FLOORS[floor - 1];
  if (standard) return standard;
  return {
    floor,
    title: `无垠心海 · 第 ${floor} 次并肩漫行`,
    era: 'boundless-mindsea',
    bossKind: 'mindsea-exit',
    requiredNodeTypes: [...ADVANCED_REQUIRED_TYPES],
    targetNodeRange: [11, 13],
  };
}

function assertFloor(floor: number) {
  if (!Number.isInteger(floor)) throw new TypeError('迷宫层数必须是整数。');
  if (floor < 1) throw new RangeError('迷宫层数必须大于或等于 1。');
}
