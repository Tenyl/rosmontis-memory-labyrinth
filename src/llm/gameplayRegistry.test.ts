import { expect, test } from 'vitest';
import { getAllowedChoiceIds, isRegisteredIntent, isRegisteredModifier } from './gameplayRegistry';

test('exposes immutable node choices, modifiers and combat intents', () => {
  expect(getAllowedChoiceIds('safehouse')).toEqual(['rest-stabilize', 'rest-vent', 'rest-rehearse']);
  expect(() => (getAllowedChoiceIds('safehouse') as string[]).push('unsafe')).toThrow();
  expect(isRegisteredModifier('two-phase-core')).toBe(true);
  expect(isRegisteredModifier('damage-999')).toBe(false);
  expect(isRegisteredIntent('charge')).toBe(true);
  expect(isRegisteredIntent('instant-win')).toBe(false);
});
