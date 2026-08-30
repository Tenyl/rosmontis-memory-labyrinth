import { describe, expect, test } from 'vitest';

import { applyModuleEffect, MODULE_CATALOG } from './modules';
import type { ModuleId } from './types';

const EXPECTED_IDS: ModuleId[] = [
  'breach-circuit',
  'watch-prism',
  'perception-array',
  'resonance-wire',
  'overload-filter',
  'memory-cache',
  'echo-recycler',
  'white-noise',
];

describe('cognitive modules', () => {
  test('catalog exposes eight unique, named build options', () => {
    expect(MODULE_CATALOG.map((module) => module.id)).toEqual(EXPECTED_IDS);
    expect(new Set(MODULE_CATALOG.map((module) => module.id)).size).toBe(8);
    expect(MODULE_CATALOG.every((module) => module.name && module.description)).toBe(true);
  });

  test.each([
    [['breach-circuit'], { type: 'breach-damage', value: 30 }, 40],
    [['watch-prism'], { type: 'opening-guard', value: 0 }, 12],
    [['perception-array'], { type: 'scout-cost', value: 1 }, 0],
    [['resonance-wire'], { type: 'resonance-stability', value: 25 }, 35],
    [['overload-filter'], { type: 'movement-overload', value: 6 }, 3],
    [['memory-cache'], { type: 'fragment-capacity', value: 3 }, 4],
    [['echo-recycler'], { type: 'combat-echoes', value: 8 }, 11],
    [['white-noise'], { type: 'unknown-penalty', value: 9 }, 5],
  ] as const)('applies %s to its matching local-rule context', (modules, context, expected) => {
    expect(applyModuleEffect([...modules], context)).toBe(expected);
  });

  test('unrelated and duplicate module IDs do not alter an effect twice', () => {
    expect(applyModuleEffect(
      ['breach-circuit', 'breach-circuit', 'watch-prism'],
      { type: 'breach-damage', value: 30 },
    )).toBe(40);
  });
});
