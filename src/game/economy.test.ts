import { describe, expect, test } from 'vitest';

import { purchaseOffer, sellFragment } from './economy';
import type { EconomyRuleState, ModuleId } from './types';

function createEconomyFixture(input: { echoes?: number; modules?: ModuleId[] } = {}): EconomyRuleState {
  return {
    economy: {
      echoes: input.echoes ?? 20,
      scoutPoints: 1,
      shopPurchases: [],
    },
    modules: input.modules ?? [],
    memoryInventory: {
      capacity: 3,
      fragments: [
        { id: 'fragment-rain', name: '倒流雨声', kind: 'standard', tags: ['感知'] },
      ],
      coreFragments: [
        { id: 'fragment-core', name: '核心记忆', kind: 'core', tags: ['核心'] },
      ],
      pendingFragment: null,
    },
  };
}

describe('memory echo economy', () => {
  test('purchase rejects insufficient echoes without mutation', () => {
    const before = createEconomyFixture({ echoes: 5 });
    const result = purchaseOffer(before, {
      id: 'offer-filter',
      kind: 'module',
      moduleId: 'overload-filter',
      price: 12,
    });

    expect(result).toEqual({
      accepted: false,
      reason: '记忆残响不足。',
      state: before,
      events: [],
    });
    expect(result.state).toBe(before);
  });

  test('duplicate modules cannot be purchased', () => {
    const before = createEconomyFixture({ echoes: 30, modules: ['breach-circuit'] });
    const result = purchaseOffer(before, {
      id: 'offer-breach',
      kind: 'module',
      moduleId: 'breach-circuit',
      price: 10,
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('该认知模块已装载。');
    expect(result.state).toBe(before);
  });

  test('purchase deducts echoes, records the offer, and applies memory capacity', () => {
    const before = createEconomyFixture({ echoes: 30 });
    const result = purchaseOffer(before, {
      id: 'offer-cache',
      kind: 'module',
      moduleId: 'memory-cache',
      price: 14,
    });

    expect(result.accepted).toBe(true);
    expect(result.state).not.toBe(before);
    expect(result.state.economy).toEqual({ echoes: 16, scoutPoints: 1, shopPurchases: ['offer-cache'] });
    expect(result.state.modules).toEqual(['memory-cache']);
    expect(result.state.memoryInventory.capacity).toBe(4);
    expect(result.events).toEqual([
      { type: 'economy.echoes-changed', delta: -14, balance: 16 },
      { type: 'module.acquired', moduleId: 'memory-cache' },
    ]);
    expect(before.memoryInventory.capacity).toBe(3);
  });

  test('selling a standard fragment grants echoes and removes only that fragment', () => {
    const before = createEconomyFixture({ echoes: 4 });
    const result = sellFragment(before, 'fragment-rain');

    expect(result.accepted).toBe(true);
    expect(result.state.economy.echoes).toBe(10);
    expect(result.state.memoryInventory.fragments).toEqual([]);
    expect(result.state.memoryInventory.coreFragments).toEqual(before.memoryInventory.coreFragments);
    expect(result.events).toEqual([
      { type: 'fragment.sold', fragmentId: 'fragment-rain', echoes: 6 },
      { type: 'economy.echoes-changed', delta: 6, balance: 10 },
    ]);
  });

  test('core fragments cannot be sold', () => {
    const before = createEconomyFixture();
    const result = sellFragment(before, 'fragment-core');

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('核心记忆不能出售。');
    expect(result.state).toBe(before);
  });
});
