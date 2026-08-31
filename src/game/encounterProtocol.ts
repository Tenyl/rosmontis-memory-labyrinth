import { sellFragment } from './economy';
import { resolveEncounterChoice } from './encounters';
import type { EncounterAction, EncounterRuleState, GreatswordId, PendingEncounter, RuleEvent } from './types';

export type { EncounterAction } from './types';

export interface EncounterResolution {
  accepted: boolean;
  reason?: string;
  state: EncounterRuleState;
  events: RuleEvent[];
  animation: GreatswordId | null;
}

const SWORD_CHOICE = {
  breach: { combat: 'combat-breach', boss: 'boss-breach' },
  watch: { combat: 'combat-guard' },
  perception: { encounter: 'wonder-observe' },
  resonance: { boss: 'boss-resonate', encounter: 'wonder-resonate' },
} as const;

export function resolveEncounterAction(
  state: EncounterRuleState,
  action: EncounterAction,
): EncounterResolution {
  const encounter = state.pendingEncounter;
  if (!encounter) return rejected(state, '当前没有待结算节点。');
  if (encounter.resolved) return rejected(state, '当前节点已经完成结算。');

  if (action.type === 'sell') {
    if (encounter.kind !== 'shop') return rejected(state, '只有在认知黑市中才能出售记忆碎片。');
    const result = sellFragment(state, action.fragmentId);
    if (!result.accepted) return rejected(state, result.reason ?? '记忆碎片无法出售。');
    return {
      accepted: true,
      state: {
        ...state,
        economy: result.state.economy,
        modules: result.state.modules,
        memoryInventory: result.state.memoryInventory,
      },
      events: [...result.events, actionEvent(encounter.nodeId, action.type)],
      animation: null,
    };
  }

  const choiceId = action.type === 'choose'
    ? action.choiceId
    : action.type === 'buy'
      ? `buy:${action.offerId}`
      : action.type === 'leave-shop'
        ? 'leave-shop'
        : swordChoice(action.swordId, encounter.kind);
  if (!choiceId) return rejected(state, '这柄巨剑无法回应当前遭遇。');

  const result = resolveEncounterChoice(state, choiceId);
  return {
    ...result,
    events: result.accepted
      ? [...result.events, actionEvent(encounter.nodeId, action.type)]
      : result.events,
    animation: action.type === 'play-sword' && result.accepted ? action.swordId : null,
  };
}

function swordChoice(swordId: GreatswordId, kind: PendingEncounter['kind']) {
  const choices = SWORD_CHOICE[swordId] as Partial<Record<typeof kind, string>>;
  return choices[kind] ?? null;
}

function actionEvent(nodeId: string, actionType: EncounterAction['type']): RuleEvent {
  return { type: 'encounter.action-resolved', nodeId, actionType };
}

function rejected(state: EncounterRuleState, reason: string): EncounterResolution {
  return { accepted: false, reason, state, events: [], animation: null };
}
