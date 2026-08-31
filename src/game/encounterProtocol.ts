import { sellFragment } from './economy';
import { resolveEncounterChoice } from './encounters';
import { resolveGreatswordAction } from './greatswords';
import { resolveComfortAction } from './overload';
import { resolveBossAction } from './bosses';
import { getCombatIntent } from './combatIntents';
import type { EncounterAction, EncounterRuleState, GreatswordId, GreatswordTarget, PendingEncounter, RuleEvent } from './types';

export type { EncounterAction } from './types';

export interface EncounterResolution {
  accepted: boolean;
  reason?: string;
  state: EncounterRuleState;
  events: RuleEvent[];
  animation: GreatswordId | 'comfort' | null;
}

const SWORD_CHOICE = {
  breach: { combat: 'combat-breach', boss: 'boss-breach' },
  watch: { combat: 'combat-guard' },
  perception: { encounter: 'wonder-observe', unknown: 'unknown-enter' },
  resonance: { boss: 'boss-resonate', encounter: 'wonder-resonate', unknown: 'unknown-enter' },
} as const;

export function resolveEncounterAction(
  state: EncounterRuleState,
  action: EncounterAction,
): EncounterResolution {
  if (action.type === 'comfort') {
    const comfort = resolveComfortAction(state.rosmontis, action.gesture);
    if (!comfort.accepted) return rejected(state, comfort.reason ?? '迷迭香现在无法回应。');
    const encounter = state.pendingEncounter;
    if (encounter?.kind === 'boss') {
      const boss = resolveBossAction(encounter, { type: 'comfort', gesture: action.gesture });
      if (!boss.accepted) return rejected(state, boss.reason ?? '现在还无法触及她。');
      return {
        accepted: true,
        state: { ...state, rosmontis: comfort.state, pendingEncounter: { ...encounter, ...boss.state } },
        events: [...comfort.events, actionEvent(encounter.nodeId, action.type)],
        animation: 'comfort',
      };
    }
    return {
      accepted: true,
      state: { ...state, rosmontis: comfort.state },
      events: comfort.events,
      animation: 'comfort',
    };
  }
  const encounter = state.pendingEncounter;
  if (!encounter) return rejected(state, '当前没有待结算节点。');
  if (encounter.resolved) return rejected(state, '当前节点已经完成结算。');

  if (action.type === 'recover') {
    const hasCooldown = Object.values(state.rosmontis.greatswords).some(({ cooldown }) => cooldown > 0);
    if (!hasCooldown && state.rosmontis.actionPoints >= 4) return rejected(state, '战术资源已经处于可用状态。');
    const intent = encounter.kind === 'combat'
      ? getCombatIntent(encounter.round, (encounter.enemyMaxIntegrity ?? 80) > 80, encounter.intentPlan)
      : null;
    const interrupted = encounter.kind === 'combat'
      && intent?.interruptible
      && (encounter.enemyStagger ?? 1) <= 0;
    const incomingDamage = interrupted ? 0 : (intent?.damage ?? 0);
    const turnBarrier = encounter.kind === 'combat' ? 8 : 0;
    const availableGuard = state.rosmontis.guard + turnBarrier;
    const absorbed = Math.min(availableGuard, incomingDamage);
    const nextRosmontis = {
      ...state.rosmontis,
      actionPoints: 4,
      sanity: Math.max(0, state.rosmontis.sanity - (incomingDamage - absorbed)),
      overload: Math.min(100, Math.max(0, state.rosmontis.overload - 2 + (interrupted ? 0 : (intent?.overload ?? 0)))),
      guard: Math.max(0, availableGuard - absorbed),
      greatswords: Object.fromEntries(Object.entries(state.rosmontis.greatswords).map(([id, sword]) => [id, { cooldown: Math.max(0, sword.cooldown - 1) }])) as typeof state.rosmontis.greatswords,
    };
    return {
      accepted: true,
      state: {
        ...state,
        rosmontis: nextRosmontis,
        pendingEncounter: encounter.kind === 'combat'
          ? { ...encounter, round: encounter.round + 1, enemyStagger: interrupted ? encounter.enemyMaxStagger : encounter.enemyStagger }
          : encounter,
      },
      events: [actionEvent(encounter.nodeId, action.type)],
      animation: null,
    };
  }

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

  let workingState = state;
  let swordEvents: RuleEvent[] = [];
  if (action.type === 'play-sword') {
    const node = state.maze.nodes.find((item) => item.id === encounter.nodeId);
    if (!node) return rejected(state, '当前遭遇缺少对应的迷宫节点。');
    const sword = resolveGreatswordAction(state.rosmontis, {
      swordId: action.swordId,
      target: SWORD_TARGET[action.swordId],
      nodeType: node.type,
    }, state.randomState);
    if (!sword.accepted) return rejected(state, sword.reason ?? '这柄巨剑现在无法回应。');
    workingState = { ...state, rosmontis: sword.state, randomState: sword.randomState };
    swordEvents = sword.events;
    if (action.swordId === 'watch' && encounter.kind === 'combat') {
      return {
        accepted: true,
        state: { ...workingState, pendingEncounter: encounter },
        events: [...swordEvents, actionEvent(encounter.nodeId, action.type)],
        animation: 'watch',
      };
    }
  }

  const choiceId = action.type === 'choose'
    ? action.choiceId
    : action.type === 'buy'
      ? `buy:${action.offerId}`
      : action.type === 'leave-shop'
        ? 'leave-shop'
        : swordChoice(action.swordId, encounter.kind);
  if (!choiceId && action.type === 'play-sword') {
    return {
      accepted: true,
      state: workingState,
      events: [...swordEvents, actionEvent(encounter.nodeId, action.type)],
      animation: action.swordId,
    };
  }
  if (!choiceId) return rejected(state, '这柄巨剑无法回应当前遭遇。');

  const result = resolveEncounterChoice(workingState, choiceId);
  if (!result.accepted) return rejected(state, result.reason ?? '遭遇行动无法执行。');
  return {
    ...result,
    events: [...swordEvents, ...result.events, actionEvent(encounter.nodeId, action.type)],
    animation: action.type === 'play-sword' && result.accepted ? action.swordId : null,
  };
}

export function resolveEncounterActionsAtomically(
  state: EncounterRuleState,
  actions: readonly EncounterAction[],
): EncounterResolution {
  if (actions.length === 0) return rejected(state, '战术序列不能为空。');
  let working = state;
  const events: RuleEvent[] = [];
  let animation: EncounterResolution['animation'] = null;
  for (const action of actions) {
    const resolution = resolveEncounterAction(working, action);
    if (!resolution.accepted) return rejected(state, resolution.reason ?? '战术序列无法完整执行。');
    working = resolution.state;
    events.push(...resolution.events);
    animation = resolution.animation ?? animation;
  }
  return { accepted: true, state: working, events, animation };
}

const SWORD_TARGET: Record<GreatswordId, GreatswordTarget> = {
  breach: 'hostile', watch: 'self', perception: 'maze', resonance: 'memory',
};

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
