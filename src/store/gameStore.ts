import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { buildDemoState } from '../data/demoData';
import { createRun, reduceRunAction, type RunResolution } from '../game/run';
import type {
  FragmentOverflowChoice,
  GreatswordAction,
  EncounterAction,
  ExplorationPowerAction,
  MemoryFragment,
  RoguelikeState,
  RuleEvent,
  RunAction,
  RunMode,
} from '../game/types';
import {
  acceptForRun,
  beginDirectorRequest as beginDirectorRequestState,
  completeDirectorRequest as completeDirectorRequestState,
  createLlmDirectorState,
  failDirectorRequest as failDirectorRequestState,
  markDirectorTriggerHandled as markDirectorTriggerHandledState,
  resolveIntentEffect,
  type DirectorContentSource,
} from '../llm/directorState';
import type { IndependentEventContent, NovelBlueprintContent, TemporaryQuoteContent } from '../llm/gameContent';
import type { GameContentRequestErrorCode, GameContentTask } from '../llm/gameContentClient';
import type {
  GameDataState,
  GenerationStatus,
  InputMode,
  NotificationItem,
  MemoryCompendiumEntry,
  RunHistoryRecord,
  TacticalDomainEvent,
  UiPreferences,
} from '../types/game';
import { migrateGameState } from './gameStateMigration';
import { createLocalDiaryDraft } from '../diary/localDiary';
import { getFloorDefinition } from '../game/floors';
import { resolveD20Check } from '../game/checks';

interface GameActions {
  dispatchRunAction: (action: RunAction) => RunResolution;
  startRun: (seed: string, mode: RunMode, llmEnabled: boolean, manualStart?: boolean) => void;
  moveToNode: (nodeId: string) => void;
  beginCurrentEncounter: () => void;
  resolveEncounterChoice: (choiceId: string) => void;
  resolveEncounterAction: (action: EncounterAction) => void;
  purchaseShopOffer: (offerId: string) => void;
  sellRunFragment: (fragmentId: string) => void;
  useExplorationPower: (action: ExplorationPowerAction) => void;
  spendScoutPoint: (nodeId: string) => void;
  advanceRunFloor: () => void;
  continueToMindsea: (llmEnabled: boolean) => void;
  useGreatsword: (action: GreatswordAction) => void;
  completeCurrentNode: (fragment?: MemoryFragment) => void;
  applyRunVitals: (sanityDelta: number, overloadDelta: number) => void;
  stabilizeMemoryCore: () => void;
  resolveFragmentChoice: (choice: FragmentOverflowChoice) => void;
  acknowledgeDiaryDraft: (draftId: string) => void;
  resetRun: () => void;
  beginDirectorRequest: (kind: GameContentTask, triggerKey: string) => string;
  completeDirectorRequest: (kind: GameContentTask, token: string) => void;
  acceptDirectorEvent: (token: string, triggerKey: string, content: IndependentEventContent, source: DirectorContentSource) => void;
  acceptDirectorQuote: (token: string, triggerKey: string, content: TemporaryQuoteContent, source: DirectorContentSource) => void;
  acceptNovelBlueprint: (token: string, triggerKey: string, content: NovelBlueprintContent, source: DirectorContentSource, task?: 'novel' | 'mindsea') => void;
  failDirectorRequest: (kind: GameContentTask, token: string, errorCode: GameContentRequestErrorCode) => void;
  markDirectorTriggerHandled: (triggerKey: string) => void;
  resolveDirectorChoice: (choiceId: string) => void;
  resetDirectorForRun: () => void;
  setNarrativeDraft: (draft: string) => void;
  setInputMode: (inputMode: InputMode) => void;
  setGenerationStatus: (generationStatus: GenerationStatus) => void;
  setInputError: (inputError: string | null) => void;
  startGeneratedEntry: (command: string, entryId: string) => void;
  appendGeneratedChunk: (entryId: string, chunk: string) => void;
  setMazeView: (viewMode: 'graph' | 'list') => void;
  setUiPreference: <K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => void;
  setOperatorStress: (operatorId: string, stress: number) => void;
  applyTavernEvents: (events: TacticalDomainEvent[], sessionId: string) => void;
  activateTavernProjection: (sessionId: string | null) => void;
  reconcileTavernProjection: (sessionId: string, survivingMessageIds: string[]) => void;
  branchTavernProjection: (sourceSessionId: string, targetSessionId: string, survivingMessageIds: string[]) => void;
  addNotification: (item: NotificationItem) => void;
  dismissNotification: (notificationId: string) => void;
  resetDemoState: () => void;
}

export type GameStore = GameDataState & GameActions;

function selectRoguelikeState(state: GameStore): RoguelikeState {
  return {
    run: state.run,
    maze: state.maze,
    rosmontis: state.rosmontis,
    memoryInventory: state.memoryInventory,
    progression: state.progression,
    randomState: state.randomState,
    economy: state.economy,
    modules: state.modules,
    explorationCharges: state.explorationCharges,
    routeEffects: state.routeEffects,
    pendingEncounter: state.pendingEncounter,
    pendingDiaryDrafts: state.pendingDiaryDrafts,
  };
}

function applyRoguelikeState(
  state: GameStore,
  next: RoguelikeState,
  events: RuleEvent[],
): Partial<GameStore> {
  const operator = state.operators.byId.rosmontis;
  const memoryCompendium = updateMemoryCompendium(state.memoryCompendium, next, events);
  const runHistory = updateRunHistory(state.runHistory, next, events);
  const pendingDiaryDrafts = updatePendingDiaryDrafts(state, next, events);
  return {
    run: next.run,
    maze: next.maze,
    rosmontis: next.rosmontis,
    memoryInventory: next.memoryInventory,
    progression: next.progression,
    randomState: next.randomState,
    economy: next.economy,
    modules: next.modules,
    explorationCharges: next.explorationCharges,
    routeEffects: next.routeEffects,
    pendingEncounter: next.pendingEncounter,
    pendingDiaryDrafts,
    ruleLog: [...state.ruleLog, ...events],
    memoryCompendium,
    runHistory,
    operators: {
      ...state.operators,
      byId: {
        rosmontis: {
          ...operator,
          sanity: next.rosmontis.sanity,
          stress: next.rosmontis.overload,
          actionPoints: next.rosmontis.actionPoints,
          condition: next.run.phase === 'defeat' ? '认知链路中断' : operator.condition,
        },
      },
      squadOrder: ['rosmontis'],
      formation: '单人认知潜入',
    },
  };
}

function updatePendingDiaryDrafts(state: GameStore, next: RoguelikeState, events: RuleEvent[]) {
  const snapshot = {
    runId: state.run.id,
    floor: state.run.floor,
    sanity: next.rosmontis.sanity,
    overload: next.rosmontis.overload,
  };
  const generated = [] as import('../game/types').DiaryDraft[];
  const completedNodeIds = events.flatMap((event) => event.type === 'node.completed' ? [event.nodeId] : []);
  completedNodeIds.forEach((nodeId) => {
    const node = state.maze.nodes.find((item) => item.id === nodeId);
    if (node?.type === 'boss') {
      generated.push(createLocalDiaryDraft({ type: 'boss-completed', nodeId, bossTitle: getFloorDefinition(state.run.floor).title }, snapshot));
    }
  });
  if (next.run.floor > state.run.floor || events.some((event) => event.type === 'run.ended' && event.result === 'victory')) {
    generated.push(createLocalDiaryDraft({ type: 'floor-completed', floor: state.run.floor, floorTitle: getFloorDefinition(state.run.floor).title }, snapshot));
  }
  const contextual = [...state.pendingDiaryDrafts, ...next.pendingDiaryDrafts, ...generated].map((draft) => ({
    ...draft,
    runId: draft.runId ?? state.run.id,
    floor: draft.floor ?? state.run.floor,
  }));
  return contextual.filter((draft, index, drafts) => drafts.findIndex((item) => item.triggerKey === draft.triggerKey) === index);
}

function updateMemoryCompendium(
  current: MemoryCompendiumEntry[],
  next: RoguelikeState,
  events: RuleEvent[],
): MemoryCompendiumEntry[] {
  const acquiredIds = new Set(events.flatMap((event) => {
    if (event.type === 'fragment.acquired') return [event.fragmentId];
    if (event.type === 'fragment.replaced') return [event.acquiredFragmentId];
    return [];
  }));
  if (acquiredIds.size === 0) return current;
  const fragments = [...next.memoryInventory.fragments, ...next.memoryInventory.coreFragments];
  return [...acquiredIds].reduce<MemoryCompendiumEntry[]>((entries, fragmentId) => {
    const fragment = fragments.find((item) => item.id === fragmentId);
    if (!fragment) return entries;
    const existing = entries.find((item) => item.id === fragmentId);
    if (existing) {
      return entries.map((item) => item.id === fragmentId
        ? { ...item, discoveries: item.discoveries + 1 }
        : item);
    }
    return [...entries, {
      id: fragment.id,
      name: fragment.name,
      kind: fragment.kind,
      tags: [...fragment.tags],
      discoveredRunId: next.run.id,
      discoveries: 1,
    }];
  }, current);
}

function updateRunHistory(
  current: RunHistoryRecord[],
  next: RoguelikeState,
  events: RuleEvent[],
): RunHistoryRecord[] {
  const ended = events.find((event) => event.type === 'run.ended');
  if (!ended || current.some((record) => record.runId === next.run.id)) return current;
  return [...current, {
    id: `history-${next.run.id}`,
    runId: next.run.id,
    seed: next.run.seed,
    mode: next.run.mode,
    result: ended.result,
    floor: next.run.floor,
    turns: next.run.turn,
    completedNodes: next.maze.nodes.filter((node) => node.state === 'completed').length,
    fragmentsRecovered: next.memoryInventory.fragments.length + next.memoryInventory.coreFragments.length,
    finalSanity: next.rosmontis.sanity,
    finalOverload: next.rosmontis.overload,
    recordedAt: timestamp(),
  }];
}

export function sanitizeSingleProtagonistState(state: GameDataState): GameDataState {
  const fallback = buildDemoState().operators.byId.rosmontis;
  const rosmontis = state.operators.byId.rosmontis ?? fallback;

  return {
    ...state,
    operators: {
      byId: { rosmontis: { ...rosmontis } },
      squadOrder: ['rosmontis'],
      formation: '单人认知潜入',
    },
  };
}

function buildPersistedState(state: GameStore): GameDataState {
  const ui = { ...state.ui, activeDialog: null, notifications: [] };
  if (!state.ui.preferences.autosave) {
    const demo = buildDemoState();
    return {
      ...demo,
      ui: { ...demo.ui, preferences: state.ui.preferences, activeDialog: null, notifications: [] },
    };
  }

  return {
    run: state.run,
    maze: state.maze,
    rosmontis: state.rosmontis,
    memoryInventory: state.memoryInventory,
    progression: state.progression,
    ruleLog: state.ruleLog,
    randomState: state.randomState,
    economy: state.economy,
    modules: state.modules,
    explorationCharges: state.explorationCharges,
    routeEffects: state.routeEffects,
    pendingEncounter: state.pendingEncounter,
    llmDirector: state.llmDirector,
    memoryCompendium: state.memoryCompendium,
    runHistory: state.runHistory,
    pendingDiaryDrafts: state.pendingDiaryDrafts,
    session: state.session,
    narrative: state.narrative,
    operators: state.operators,
    tavernProjection: state.tavernProjection,
    ui,
  };
}

function timestamp() {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

function clearMaterializedProjection(state: GameStore): GameStore {
  const demo = buildDemoState();
  const byId = Object.fromEntries(Object.entries(state.operators.byId).map(([id, operator]) => {
    if (!operator.sourceSessionId) return [id, operator];
    const baseline = demo.operators.byId[id];
    return [id, baseline ? { ...operator, stress: baseline.stress, sanity: baseline.sanity, condition: baseline.condition, sourceSessionId: undefined, sourceMessageId: undefined, matchedLorebookEntryIds: undefined } : operator];
  }));
  return {
    ...state,
    session: state.session.sourceSessionId ? {
      ...state.session,
      globalRisk: demo.session.globalRisk,
      objective: demo.session.objective,
      squadStatus: demo.session.squadStatus,
      sourceSessionId: undefined,
      sourceMessageId: undefined,
      matchedLorebookEntryIds: undefined,
    } : state.session,
    operators: { ...state.operators, byId },
  };
}

function materializeEvent(state: GameStore, event: TacticalDomainEvent, sessionId: string): GameStore {
  const source = {
    sourceSessionId: sessionId,
    sourceMessageId: event.sourceMessageId,
    ...(event.matchedLorebookEntryIds?.length ? { matchedLorebookEntryIds: [...event.matchedLorebookEntryIds] } : {}),
  };
  if (event.type === 'operator.stress.changed' || event.type === 'operator.sanity.changed') {
    const operator = state.operators.byId[event.operatorId];
    if (!operator) return state;
    return {
      ...state,
      operators: {
        ...state.operators,
        byId: {
          ...state.operators.byId,
          [event.operatorId]: {
            ...operator,
            ...(event.type === 'operator.stress.changed' ? { stress: event.value } : { sanity: event.value }),
            ...source,
          },
        },
      },
    };
  }

  if (event.type === 'session.risk.changed' || event.type === 'session.objective.changed' || event.type === 'squad.status.changed') {
    return {
      ...state,
      session: {
        ...state.session,
        ...(event.type === 'session.risk.changed' ? { globalRisk: event.value } : {}),
        ...(event.type === 'session.objective.changed' ? { objective: event.value } : {}),
        ...(event.type === 'squad.status.changed' ? { squadStatus: event.value } : {}),
        ...source,
      },
    };
  }

  return state;
}

function materializeSession(state: GameStore, sessionId: string | null, events: TacticalDomainEvent[]): GameStore {
  const cleared = clearMaterializedProjection(state);
  if (!sessionId) return cleared;
  return events.reduce((current, event) => materializeEvent(current, event, sessionId), cleared);
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...buildDemoState(),
      dispatchRunAction: (action) => {
        const state = get();
        const resolution = reduceRunAction(selectRoguelikeState(state), action);
        if (resolution.accepted) {
          set(applyRoguelikeState(state, resolution.state, resolution.events));
        }
        return resolution;
      },
      startRun: (seed, mode, llmEnabled, manualStart = false) =>
        set((state) => {
          const next = createRun({ seed, mode, progression: state.progression, llmEnabled, manualStart });
          return {
            ...applyRoguelikeState(state, next, []),
            ruleLog: [],
            llmDirector: createLlmDirectorState(next.run.id),
          };
        }),
      moveToNode: (nodeId) => { get().dispatchRunAction({ type: 'move-to-node', nodeId }); },
      beginCurrentEncounter: () => { get().dispatchRunAction({ type: 'begin-node' }); },
      resolveEncounterChoice: (choiceId) => { get().dispatchRunAction({ type: 'resolve-encounter', choiceId }); },
      resolveEncounterAction: (action) => { get().dispatchRunAction({ type: 'resolve-encounter-action', action }); },
      purchaseShopOffer: (offerId) => { get().dispatchRunAction({ type: 'purchase-offer', offerId }); },
      sellRunFragment: (fragmentId) => { get().dispatchRunAction({ type: 'sell-fragment', fragmentId }); },
      useExplorationPower: (action) => { get().dispatchRunAction({ type: 'use-exploration-power', action }); },
      spendScoutPoint: (nodeId) => { get().dispatchRunAction({ type: 'spend-scout-point', nodeId }); },
      advanceRunFloor: () => { get().dispatchRunAction({ type: 'advance-floor' }); },
      continueToMindsea: (llmEnabled) => { get().dispatchRunAction({ type: 'continue-to-mindsea', llmEnabled }); },
      useGreatsword: (action) => { get().dispatchRunAction({ type: 'use-greatsword', action }); },
      completeCurrentNode: (fragment) => { get().dispatchRunAction({ type: 'complete-node', fragment }); },
      applyRunVitals: (sanityDelta, overloadDelta) => {
        get().dispatchRunAction({ type: 'apply-vitals', sanityDelta, overloadDelta });
      },
      stabilizeMemoryCore: () => { get().dispatchRunAction({ type: 'stabilize-core' }); },
      resolveFragmentChoice: (choice) => { get().dispatchRunAction({ type: 'resolve-fragment-overflow', choice }); },
      acknowledgeDiaryDraft: (draftId) => set((state) => ({ pendingDiaryDrafts: state.pendingDiaryDrafts.filter((draft) => draft.id !== draftId) })),
      resetRun: () =>
        set((state) => {
          const next = createRun({
            seed: 'PRESET-RAIN-ECHO',
            mode: 'preset',
            progression: state.progression,
            llmEnabled: false,
          });
          return {
            ...applyRoguelikeState(state, next, []),
            ruleLog: [],
            llmDirector: createLlmDirectorState(next.run.id),
          };
        }),
      beginDirectorRequest: (kind, triggerKey) => {
        const result = beginDirectorRequestState(get().llmDirector, kind, triggerKey);
        set({ llmDirector: result.state });
        return result.token;
      },
      completeDirectorRequest: (kind, token) =>
        set((state) => ({
          llmDirector: completeDirectorRequestState(state.llmDirector, state.run.id, kind, token),
        })),
      acceptDirectorEvent: (token, triggerKey, content, source) =>
        set((state) => ({
          llmDirector: acceptForRun(state.llmDirector, state.run.id, 'event', token, (director) => ({
            ...director,
            event: { triggerKey, content, source, resolvedChoiceId: null },
          })),
        })),
      acceptDirectorQuote: (token, triggerKey, content, source) =>
        set((state) => ({
          llmDirector: acceptForRun(state.llmDirector, state.run.id, 'quote', token, (director) => ({
            ...director,
            quote: { triggerKey, content, source },
          })),
        })),
      acceptNovelBlueprint: (token, triggerKey, content, source, task = 'novel') =>
        set((state) => ({
          llmDirector: acceptForRun(state.llmDirector, state.run.id, task, token, (director) => ({
            ...director,
            novel: { triggerKey, content, source },
          })),
        })),
      failDirectorRequest: (kind, token, errorCode) =>
        set((state) => ({
          llmDirector: failDirectorRequestState(state.llmDirector, state.run.id, kind, token, errorCode),
        })),
      markDirectorTriggerHandled: (triggerKey) =>
        set((state) => ({ llmDirector: markDirectorTriggerHandledState(state.llmDirector, triggerKey) })),
      resolveDirectorChoice: (choiceId) =>
        set((state) => {
          const event = state.llmDirector.event;
          if (!event || event.resolvedChoiceId) return state;
          const choice = event.content.choices.find((item) => item.id === choiceId);
          if (!choice) return state;
          const check = choice.check ? resolveD20Check({
            attribute: choice.check.attribute,
            modifier: choice.check.attribute === 'perception'
              ? state.rosmontis.insight
              : Math.floor((state.rosmontis.sanity - 50) / 10),
            difficulty: choice.check.threshold,
          }, state.randomState) : null;
          const effect = check && !check.result.passed
            ? { sanityDelta: -2, overloadDelta: 4 }
            : resolveIntentEffect(choice.intent, state.rosmontis);
          const resolution = reduceRunAction(selectRoguelikeState(state), { type: 'apply-vitals', ...effect });
          if (!resolution.accepted) return state;
          return {
            ...applyRoguelikeState(state, {
              ...resolution.state,
              randomState: check?.randomState ?? resolution.state.randomState,
            }, [...(check?.events ?? []), ...resolution.events]),
            llmDirector: {
              ...state.llmDirector,
              event: { ...event, resolvedChoiceId: choiceId },
            },
          };
        }),
      resetDirectorForRun: () =>
        set((state) => ({ llmDirector: createLlmDirectorState(state.run.id) })),
      setNarrativeDraft: (draft) =>
        set((state) => ({ narrative: { ...state.narrative, draft, inputError: null } })),
      setInputMode: (inputMode) =>
        set((state) => ({ narrative: { ...state.narrative, inputMode } })),
      setGenerationStatus: (generationStatus) =>
        set((state) => ({ narrative: { ...state.narrative, generationStatus } })),
      setInputError: (inputError) =>
        set((state) => ({ narrative: { ...state.narrative, inputError } })),
      startGeneratedEntry: (command, entryId) =>
        set((state) => ({
          narrative: {
            ...state.narrative,
            generationStatus: 'streaming',
            activeEntryId: entryId,
            inputError: null,
            entries: [
              ...state.narrative.entries,
              {
                id: entryId,
                index: state.narrative.entries.length + 7,
                kind: '叙事',
                title: '本地叙事模型正在解析',
                body: '',
                timestamp: '03:31:44',
                relatedIds: [],
              },
            ],
          },
        })),
      appendGeneratedChunk: (entryId, chunk) =>
        set((state) => ({
          narrative: {
            ...state.narrative,
            entries: state.narrative.entries.map((entry) =>
              entry.id === entryId
                ? { ...entry, body: entry.body ? `${entry.body}\n${chunk}` : chunk }
                : entry,
            ),
          },
        })),
      setMazeView: (viewMode) =>
        set((state) => ({ ui: { ...state.ui, mazeViewMode: viewMode } })),
      setUiPreference: (key, value) =>
        set((state) => ({
          ui: {
            ...state.ui,
            preferences: { ...state.ui.preferences, [key]: value },
          },
        })),
      setOperatorStress: (operatorId, stress) =>
        set((state) => {
          const operator = state.operators.byId[operatorId];
          if (!operator) return state;

          return {
            operators: {
              ...state.operators,
              byId: {
                ...state.operators.byId,
                [operatorId]: { ...operator, stress },
              },
            },
          };
        }),
      applyTavernEvents: (events, sessionId) =>
        set((state) => {
          const normalizedSessionId = sessionId.trim();
          if (!normalizedSessionId || events.length === 0) return state;
          const messageIds = [...new Set(events.map((event) => event.sourceMessageId))];
          const existing = state.tavernProjection.sessions[normalizedSessionId] ?? { processedMessageIds: [], events: [] };
          const freshMessageIds = messageIds.filter((id) => !existing.processedMessageIds.includes(id));
          if (freshMessageIds.length === 0) return state;
          const freshEvents = events.filter((event) => freshMessageIds.includes(event.sourceMessageId));
          const snapshot = {
            processedMessageIds: [...existing.processedMessageIds, ...freshMessageIds],
            events: [...existing.events, ...freshEvents],
          };
          const sessions = { ...state.tavernProjection.sessions, [normalizedSessionId]: snapshot };
          const activeSessionId = state.tavernProjection.activeSessionId ?? normalizedSessionId;
          const next = activeSessionId === normalizedSessionId
            ? materializeSession(state, normalizedSessionId, snapshot.events)
            : state;
          return {
            ...next,
            tavernProjection: { activeSessionId, sessions },
          };
        }),
      activateTavernProjection: (sessionId) =>
        set((state) => {
          const normalizedSessionId = sessionId?.trim() || null;
          const events = normalizedSessionId
            ? state.tavernProjection.sessions[normalizedSessionId]?.events ?? []
            : [];
          const next = materializeSession(state, normalizedSessionId, events);
          return {
            ...next,
            tavernProjection: { ...state.tavernProjection, activeSessionId: normalizedSessionId },
          };
        }),
      reconcileTavernProjection: (sessionId, survivingMessageIds) =>
        set((state) => {
          const existing = state.tavernProjection.sessions[sessionId];
          if (!existing) return state;
          const surviving = new Set(survivingMessageIds);
          const snapshot = {
            processedMessageIds: existing.processedMessageIds.filter((id) => surviving.has(id)),
            events: existing.events.filter((event) => surviving.has(event.sourceMessageId)),
          };
          const sessions = { ...state.tavernProjection.sessions, [sessionId]: snapshot };
          const next = state.tavernProjection.activeSessionId === sessionId
            ? materializeSession(state, sessionId, snapshot.events)
            : state;
          return { ...next, tavernProjection: { ...state.tavernProjection, sessions } };
        }),
      branchTavernProjection: (sourceSessionId, targetSessionId, survivingMessageIds) =>
        set((state) => {
          const source = state.tavernProjection.sessions[sourceSessionId];
          const surviving = new Set(survivingMessageIds);
          const snapshot = source ? {
            processedMessageIds: source.processedMessageIds.filter((id) => surviving.has(id)),
            events: source.events.filter((event) => surviving.has(event.sourceMessageId)),
          } : { processedMessageIds: [], events: [] };
          const sessions = { ...state.tavernProjection.sessions, [targetSessionId]: snapshot };
          const next = materializeSession(state, targetSessionId, snapshot.events);
          return { ...next, tavernProjection: { activeSessionId: targetSessionId, sessions } };
        }),
      addNotification: (item) =>
        set((state) => ({
          ui: {
            ...state.ui,
            notifications: [
              ...state.ui.notifications.filter((notification) => notification.id !== item.id),
              item,
            ],
          },
        })),
      dismissNotification: (notificationId) =>
        set((state) => ({
          ui: {
            ...state.ui,
            notifications: state.ui.notifications.filter((item) => item.id !== notificationId),
          },
        })),
      resetDemoState: () => set(buildDemoState()),
    }),
    {
      name: 'rhodes-cognition-terminal-state',
      version: 8,
      storage: createJSONStorage(() => localStorage),
      partialize: buildPersistedState,
      migrate: (persistedState) => migrateGameState(persistedState, buildDemoState()),
      merge: (persistedState, currentState) => {
        const migrated = migrateGameState(persistedState, buildDemoState());
        return { ...currentState, ...migrated };
      },
    },
  ),
);
