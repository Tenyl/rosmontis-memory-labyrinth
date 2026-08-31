import { expect, test } from 'vitest';
import { NODE_CATALOG, getNodeDefinition } from './nodeCatalog';

test('defines all eight maze node types in one local catalog', () => {
  expect(Object.keys(NODE_CATALOG)).toEqual([
    'combat',
    'emergency-combat',
    'safehouse',
    'shop',
    'encounter',
    'dilemma',
    'unknown',
    'boss',
  ]);
});

test('marks emergency combat as reinforced high-threat combat with a high-tier reward', () => {
  expect(getNodeDefinition('emergency-combat')).toMatchObject({
    category: 'combat',
    rewardTier: 'high',
    combat: { enemyIntegrity: 120, rewardEchoes: 14 },
  });
  expect(getNodeDefinition('emergency-combat').defaultModifiers).toEqual(
    expect.arrayContaining(['high-threat', 'overload-surge', 'reinforced-shield']),
  );
});

test('describes dilemma choices with an explicit cost and reward', () => {
  const choices = getNodeDefinition('dilemma').dilemmaChoices ?? [];

  expect(choices).toHaveLength(2);
  expect(choices.every((choice) => choice.cost.length > 0 && choice.reward.length > 0)).toBe(true);
});
