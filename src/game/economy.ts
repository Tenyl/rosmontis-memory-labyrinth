import { applyModuleEffect, getModule } from './modules';
import type {
  EconomyRuleState,
  ModuleShopOffer,
  RuleEvent,
} from './types';

export interface EconomyResolution {
  accepted: boolean;
  reason?: string;
  state: EconomyRuleState;
  events: RuleEvent[];
}

function rejected(state: EconomyRuleState, reason: string): EconomyResolution {
  return { accepted: false, reason, state, events: [] };
}

export function purchaseOffer(
  state: EconomyRuleState,
  offer: ModuleShopOffer,
): EconomyResolution {
  if (!Number.isInteger(offer.price) || offer.price < 0) {
    return rejected(state, '交易价格无效。');
  }
  getModule(offer.moduleId);
  if (state.economy.shopPurchases.includes(offer.id)) {
    return rejected(state, '该认知黑市报价已经结算。');
  }
  if (state.modules.includes(offer.moduleId)) {
    return rejected(state, '该认知模块已装载。');
  }
  if (state.economy.echoes < offer.price) {
    return rejected(state, '记忆残响不足。');
  }

  const balance = state.economy.echoes - offer.price;
  const modules = [...state.modules, offer.moduleId];
  const capacity = applyModuleEffect(
    [offer.moduleId],
    { type: 'fragment-capacity', value: state.memoryInventory.capacity },
  );
  const nextState: EconomyRuleState = {
    economy: {
      ...state.economy,
      echoes: balance,
      shopPurchases: [...state.economy.shopPurchases, offer.id],
    },
    modules,
    memoryInventory: capacity === state.memoryInventory.capacity
      ? state.memoryInventory
      : { ...state.memoryInventory, capacity },
  };

  return {
    accepted: true,
    state: nextState,
    events: [
      { type: 'economy.echoes-changed', delta: -offer.price, balance },
      { type: 'module.acquired', moduleId: offer.moduleId },
    ],
  };
}

export function sellFragment(
  state: EconomyRuleState,
  fragmentId: string,
): EconomyResolution {
  if (state.memoryInventory.coreFragments.some((fragment) => fragment.id === fragmentId)) {
    return rejected(state, '核心记忆不能出售。');
  }
  const fragment = state.memoryInventory.fragments.find((item) => item.id === fragmentId);
  if (!fragment) return rejected(state, '未找到可出售的记忆碎片。');

  const echoes = 6;
  const balance = state.economy.echoes + echoes;
  return {
    accepted: true,
    state: {
      economy: { ...state.economy, echoes: balance },
      modules: state.modules,
      memoryInventory: {
        ...state.memoryInventory,
        fragments: state.memoryInventory.fragments.filter((item) => item.id !== fragmentId),
      },
    },
    events: [
      { type: 'fragment.sold', fragmentId, echoes },
      { type: 'economy.echoes-changed', delta: echoes, balance },
    ],
  };
}
