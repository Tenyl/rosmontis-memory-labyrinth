import { expect, test } from 'vitest';
import { applyFragmentEffects } from './fragmentCatalog';
import type { MemoryFragment } from './types';

const fragment = (kind: MemoryFragment['kind']): MemoryFragment => ({
  id: `fragment-${kind}`, name: `测试${kind}碎片`, kind, tags: [],
});

test('emotion fragments restore stability, lower overload, and preserve sadness resistance', () => {
  const result = applyFragmentEffects({
    sanity: 50, overload: 30, baseDamage: 30, scoutPoints: 1, cooldown: 2,
  }, [fragment('emotion')]);

  expect(result).toMatchObject({ sanity: 56, overload: 26, sadnessResistance: 4 });
});

test('pain fragments increase damage and overload and cause hallucination at high overload', () => {
  const stable = applyFragmentEffects({
    sanity: 80, overload: 20, baseDamage: 30, scoutPoints: 1, cooldown: 2,
  }, [fragment('pain')]);
  const overloaded = applyFragmentEffects({
    sanity: 80, overload: 70, baseDamage: 30, scoutPoints: 1, cooldown: 2,
  }, [fragment('pain')]);

  expect(stable.baseDamage).toBe(42);
  expect(stable.overload).toBe(26);
  expect(overloaded.hallucinating).toBe(true);
});

test('skill fragments improve scouting and cooldown recovery', () => {
  const result = applyFragmentEffects({
    sanity: 80, overload: 20, baseDamage: 30, scoutPoints: 1, cooldown: 2,
  }, [fragment('skill')]);

  expect(result).toMatchObject({ scoutPoints: 2, cooldown: 1 });
});
