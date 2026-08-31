import { describe, expect, test } from 'vitest';

import { getFloorDefinition, getRunEra, STANDARD_FLOORS } from './floors';

describe('standard floor catalog', () => {
  test('defines the five-stage trauma recovery route in playable order', () => {
    expect(STANDARD_FLOORS.map(({ floor, title, bossKind }) => ({ floor, title, bossKind }))).toEqual([
      { floor: 1, title: '表层残响', bossKind: 'gatekeeper' },
      { floor: 2, title: '雨幕病区', bossKind: 'gatekeeper' },
      { floor: 3, title: '冰冷实验室', bossKind: 'gatekeeper' },
      { floor: 4, title: '心防回廊', bossKind: 'gatekeeper' },
      { floor: 5, title: '核心花房', bossKind: 'closed-heart' },
    ]);
  });

  test('switches to the boundless mindsea only after the fifth floor', () => {
    expect([1, 5, 6, 27].map(getRunEra)).toEqual([
      'trauma-recovery',
      'trauma-recovery',
      'boundless-mindsea',
      'boundless-mindsea',
    ]);
    expect(getFloorDefinition(6)).toMatchObject({
      floor: 6,
      title: '无垠心海 · 第 6 次并肩漫行',
      bossKind: 'mindsea-exit',
    });
  });

  test('rejects non-positive and fractional floor indices', () => {
    expect(() => getFloorDefinition(0)).toThrow(/层数/);
    expect(() => getFloorDefinition(1.5)).toThrow(/整数/);
  });
});
