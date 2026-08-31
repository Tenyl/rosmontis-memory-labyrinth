import { describe, expect, test } from 'vitest';
import { getCombatIntent } from './combatIntents';

describe('combat intent rotation', () => {
  test('publishes a readable deterministic enemy intent for every round', () => {
    expect(getCombatIntent(1, false)).toMatchObject({ type: 'assault', damage: 14, interruptible: false });
    expect(getCombatIntent(2, false)).toMatchObject({ type: 'charge', damage: 28, interruptible: true });
    expect(getCombatIntent(3, false)).toMatchObject({ type: 'erosion', overload: 22 });
    expect(getCombatIntent(4, false)).toMatchObject({ type: 'barrier', guard: 26 });
  });

  test('emergency combat raises the disclosed threat without hiding it', () => {
    expect(getCombatIntent(1, true).damage).toBeGreaterThan(getCombatIntent(1, false).damage);
  });
});
