import { expect, test } from 'vitest';
import { createFallbackMindseaBlueprint } from './mindseaBlueprint';

test('builds a deterministic memory-aware fallback without changing topology', () => {
  const first = createFallbackMindseaBlueprint('MINDSEA', 6, ['雨幕病历', '甲板晚风']);
  expect(first).toEqual(createFallbackMindseaBlueprint('MINDSEA', 6, ['雨幕病历', '甲板晚风']));
  expect(`${first.title}${first.theme}${first.premise}`).toMatch(/雨幕病历|甲板晚风/);
  expect(first).not.toHaveProperty('nodes');
  expect(first).not.toHaveProperty('edges');
});
