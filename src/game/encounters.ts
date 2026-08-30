import { clampVital } from './checks';
import { purchaseOffer } from './economy';
import { applyModuleEffect, MODULE_CATALOG } from './modules';
import type {
  EncounterChoice,
  EncounterRuleState,
  MazeNode,
  ModuleShopOffer,
  PendingEncounter,
  RuleEvent,
} from './types';

export interface EncounterResolution {
  accepted: boolean;
  reason?: string;
  state: EncounterRuleState;
  events: RuleEvent[];
}

const REST_CHOICES: EncounterChoice[] = [
  { id: 'rest-stabilize', label: '稳定认知', description: '恢复 20 点思维稳定性。' },
  { id: 'rest-vent', label: '疏导过载', description: '降低 20 点精神过载。' },
  { id: 'rest-rehearse', label: '复盘路径', description: '获得 1 点侦测点。' },
];

const COMBAT_CHOICES: EncounterChoice[] = [
  { id: 'combat-breach', label: '破壁强攻', description: '削减敌方结构并承受反击。' },
  { id: 'combat-guard', label: '守望推进', description: '建立防护后推进战斗轮次。' },
];

const WONDER_CHOICES: EncounterChoice[] = [
  { id: 'wonder-observe', label: '观察异常', description: '承受轻微过载并回收残响。' },
  { id: 'wonder-anchor', label: '以碎片建立锚点', description: '使用感知类碎片稳定场景。', requiredTag: '感知' },
  { id: 'wonder-resonate', label: '激活共鸣层', description: '消耗已经准备的共鸣状态。', requiresResonance: true },
];

function buildShopOffers(state: EncounterRuleState, node: MazeNode): ModuleShopOffer[] {
  const available = MODULE_CATALOG.filter((module) => !state.modules.includes(module.id));
  const offset = [...node.id].reduce((sum, character) => sum + character.charCodeAt(0), 0)
    % Math.max(1, available.length);
  return Array.from({ length: Math.min(3, available.length) }, (_, index) => {
    const module = available[(offset + index) % available.length];
    const basePrice = module.rarity === 'rare' ? 14 : 10;
    return {
      id: `${node.id}-offer-${module.id}`,
      kind: 'module' as const,
      moduleId: module.id,
      price: Math.max(1, basePrice - state.routeEffects.shopDiscount),
    };
  });
}

function encounterFor(state: EncounterRuleState, node: MazeNode): PendingEncounter {
  if (node.type === 'combat') {
    return {
      kind: 'combat',
      nodeId: node.id,
      resolved: false,
      round: 1,
      maxRounds: node.risk === 'A' || node.risk === 'S' ? 3 : 2,
      enemyIntegrity: 80,
      rewardEchoes: 8,
      choices: COMBAT_CHOICES,
    };
  }
  if (node.type === 'rest') {
    return { kind: 'rest', nodeId: node.id, resolved: false, choices: REST_CHOICES };
  }
  if (node.type === 'shop') {
    return {
      kind: 'shop',
      nodeId: node.id,
      resolved: false,
      offers: buildShopOffers(state, node),
      choices: [{ id: 'leave-shop', label: '离开商店', description: '结束本次交易。' }],
    };
  }
  if (node.type === 'wonder') {
    return { kind: 'wonder', nodeId: node.id, resolved: false, choices: WONDER_CHOICES };
  }
  if (node.type === 'unknown') {
    if (!node.hiddenType) throw new Error('未知节点缺少本地生成的真实类型。');
    return {
      kind: 'unknown',
      nodeId: node.id,
      resolved: false,
      hiddenType: node.hiddenType,
      glitch: state.rosmontis.overload >= 70,
      directEntryBonus: node.revealed ? 0 : 2,
      choices: [{ id: 'unknown-enter', label: '进入未知信号', description: '揭示并结算预先生成的节点结果。' }],
    };
  }
  return {
    kind: 'boss',
    nodeId: node.id,
    resolved: false,
    phase: 'shield',
    enemyIntegrity: 80,
    coreStability: 0,
    glitch: state.rosmontis.overload >= 70 && !state.routeEffects.bossGlitchSuppressed,
    choices: [
      { id: 'boss-breach', label: '击穿核心防护', description: '使用破壁回路削减防护完整度。' },
      { id: 'boss-resonate', label: '稳定核心共鸣', description: '在防护解除后重建核心稳定。' },
    ],
  };
}

export function createEncounter(
  state: EncounterRuleState,
  node: MazeNode,
): EncounterRuleState {
  if (state.pendingEncounter?.nodeId === node.id && !state.pendingEncounter.resolved) return state;
  return { ...state, pendingEncounter: encounterFor(state, node) };
}

function rejected(state: EncounterRuleState, reason: string): EncounterResolution {
  return { accepted: false, reason, state, events: [] };
}

function completed(
  state: EncounterRuleState,
  encounter: PendingEncounter,
  events: RuleEvent[] = [],
): EncounterResolution {
  return {
    accepted: true,
    state: { ...state, pendingEncounter: { ...encounter, resolved: true } },
    events,
  };
}

function updateVitals(
  state: EncounterRuleState,
  sanityDelta: number,
  overloadDelta: number,
): EncounterRuleState {
  return {
    ...state,
    rosmontis: {
      ...state.rosmontis,
      sanity: clampVital(state.rosmontis.sanity + sanityDelta),
      overload: clampVital(state.rosmontis.overload + overloadDelta),
    },
  };
}

function grantEchoes(
  state: EncounterRuleState,
  amount: number,
): { state: EncounterRuleState; event: RuleEvent } {
  const balance = state.economy.echoes + amount;
  return {
    state: { ...state, economy: { ...state.economy, echoes: balance } },
    event: { type: 'economy.echoes-changed', delta: amount, balance },
  };
}

export function resolveEncounterChoice(
  state: EncounterRuleState,
  choiceId: string,
): EncounterResolution {
  const encounter = state.pendingEncounter;
  if (!encounter) return rejected(state, '当前没有待结算节点。');
  if (encounter.resolved) return rejected(state, '当前节点已经完成结算。');

  if (encounter.kind === 'combat') {
    if (choiceId === 'combat-guard') {
      return {
        accepted: true,
        state: {
          ...state,
          rosmontis: { ...state.rosmontis, guard: state.rosmontis.guard + 24 },
          pendingEncounter: { ...encounter, round: encounter.round + 1 },
        },
        events: [],
      };
    }
    if (choiceId !== 'combat-breach') return rejected(state, '战斗行动无效。');
    const damage = applyModuleEffect(state.modules, { type: 'breach-damage', value: 30 });
    const enemyIntegrity = Math.max(0, encounter.enemyIntegrity - damage);
    const guarded = state.routeEffects.nextNodeGuarded || state.rosmontis.guard > 0;
    const afterCounter = updateVitals(state, guarded ? 0 : -4, 6);
    const nextEncounter = { ...encounter, enemyIntegrity, round: encounter.round + 1 };
    if (enemyIntegrity > 0) {
      return {
        accepted: true,
        state: {
          ...afterCounter,
          routeEffects: { ...state.routeEffects, nextNodeGuarded: false },
          pendingEncounter: nextEncounter,
        },
        events: [],
      };
    }
    const reward = applyModuleEffect(state.modules, {
      type: 'combat-echoes',
      value: encounter.rewardEchoes,
    });
    const granted = grantEchoes(afterCounter, reward);
    return completed(
      { ...granted.state, routeEffects: { ...state.routeEffects, nextNodeGuarded: false } },
      { ...nextEncounter, resolved: true },
      [granted.event],
    );
  }

  if (encounter.kind === 'rest') {
    if (choiceId === 'rest-stabilize') {
      return completed(updateVitals(state, 20, 0), encounter);
    }
    if (choiceId === 'rest-vent') {
      return completed(updateVitals(state, 0, -20), encounter);
    }
    if (choiceId === 'rest-rehearse') {
      return completed({
        ...state,
        economy: { ...state.economy, scoutPoints: state.economy.scoutPoints + 1 },
      }, encounter);
    }
    return rejected(state, '休整方案无效。');
  }

  if (encounter.kind === 'shop') {
    if (choiceId === 'leave-shop') return completed(state, encounter);
    if (!choiceId.startsWith('buy:')) return rejected(state, '商店操作无效。');
    const offer = encounter.offers.find((item) => item.id === choiceId.slice(4));
    if (!offer) return rejected(state, '商店报价不存在。');
    const purchase = purchaseOffer(state, offer);
    if (!purchase.accepted) return rejected(state, purchase.reason ?? '交易无法完成。');
    return {
      accepted: true,
      state: {
        ...state,
        economy: purchase.state.economy,
        modules: purchase.state.modules,
        memoryInventory: purchase.state.memoryInventory,
      },
      events: purchase.events,
    };
  }

  if (encounter.kind === 'wonder') {
    const choice = encounter.choices.find((item) => item.id === choiceId);
    if (!choice) return rejected(state, '奇境选项无效。');
    if (choice.requiredTag && !state.memoryInventory.fragments.some((fragment) => fragment.tags.includes(choice.requiredTag!))) {
      return rejected(state, `需要“${choice.requiredTag}”记忆碎片。`);
    }
    if (choice.requiresResonance && !state.routeEffects.resonanceActive) {
      return rejected(state, '需要先激活共鸣探索能力。');
    }
    if (choiceId === 'wonder-anchor') return completed(updateVitals(state, 6, -4), encounter);
    const amount = choiceId === 'wonder-resonate' ? 8 : 4;
    const granted = grantEchoes(updateVitals(state, 0, choiceId === 'wonder-observe' ? 4 : 0), amount);
    return completed({
      ...granted.state,
      routeEffects: { ...state.routeEffects, resonanceActive: false },
    }, encounter, [granted.event]);
  }

  if (encounter.kind === 'unknown') {
    if (choiceId !== 'unknown-enter') return rejected(state, '未知节点操作无效。');
    let penalty = encounter.glitch ? 10 : 6;
    penalty = applyModuleEffect(state.modules, { type: 'unknown-penalty', value: penalty });
    if (state.routeEffects.nextNodeGuarded) penalty = Math.ceil(penalty / 2);
    const hiddenEffects = encounter.hiddenType === 'combat'
      ? { sanity: -penalty, overload: penalty }
      : encounter.hiddenType === 'rest'
        ? { sanity: 10, overload: -6 }
        : encounter.hiddenType === 'shop'
          ? { sanity: 0, overload: 1 }
          : { sanity: 0, overload: 4 };
    const afterVitals = updateVitals(state, hiddenEffects.sanity, hiddenEffects.overload);
    const granted = grantEchoes(afterVitals, encounter.directEntryBonus);
    return completed({
      ...granted.state,
      routeEffects: { ...state.routeEffects, nextNodeGuarded: false },
    }, encounter, encounter.directEntryBonus > 0 ? [granted.event] : []);
  }

  if (choiceId === 'boss-breach') {
    if (encounter.phase !== 'shield') return rejected(state, '核心防护已经解除。');
    const damage = applyModuleEffect(state.modules, { type: 'breach-damage', value: 30 });
    const enemyIntegrity = Math.max(0, encounter.enemyIntegrity - damage);
    const next = updateVitals(state, encounter.glitch ? -3 : 0, encounter.glitch ? 5 : 2);
    return {
      accepted: true,
      state: {
        ...next,
        pendingEncounter: {
          ...encounter,
          enemyIntegrity,
          phase: enemyIntegrity === 0 ? 'stability' : 'shield',
        },
      },
      events: [],
    };
  }
  if (choiceId !== 'boss-resonate') return rejected(state, 'Boss 行动无效。');
  if (encounter.phase !== 'stability') return rejected(state, '必须先解除核心防护。');
  const stability = applyModuleEffect(state.modules, { type: 'resonance-stability', value: 25 });
  const coreStability = Math.min(100, encounter.coreStability + stability);
  const nextState = {
    ...state,
    rosmontis: { ...state.rosmontis, coreStability },
  };
  const nextEncounter = { ...encounter, coreStability };
  return coreStability >= 100
    ? completed(nextState, nextEncounter)
    : { accepted: true, state: { ...nextState, pendingEncounter: nextEncounter }, events: [] };
}
