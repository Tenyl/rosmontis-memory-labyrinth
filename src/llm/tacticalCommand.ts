import { resolveEncounterActionsAtomically, type EncounterResolution } from '../game/encounterProtocol';
import type { EncounterAction, EncounterRuleState } from '../game/types';
import type { TacticalActionId, TacticalCommandPlan } from './schemas/tacticalCommandV1';

export function executeTacticalCommand(
  state: EncounterRuleState,
  plan: TacticalCommandPlan,
): EncounterResolution {
  return resolveEncounterActionsAtomically(state, plan.actionIds.map(toEncounterAction));
}

export function toEncounterAction(id: TacticalActionId): EncounterAction {
  if (id === 'recover') return { type: 'recover' };
  if (id === 'comfort:hold-hand') return { type: 'comfort', gesture: 'hold-hand' };
  if (id === 'comfort:touch-forehead') return { type: 'comfort', gesture: 'touch-forehead' };
  return { type: 'play-sword', swordId: id.slice('sword:'.length) as Extract<EncounterAction, { type: 'play-sword' }>['swordId'] };
}
