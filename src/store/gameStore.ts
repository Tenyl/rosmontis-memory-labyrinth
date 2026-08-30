import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { buildDemoState, deepMemoryClue, deepMemoryNode } from '../data/demoData';
import { createRun, reduceRunAction } from '../game/run';
import type {
  FragmentOverflowChoice,
  GreatswordAction,
  MemoryFragment,
  RoguelikeState,
  RuleEvent,
  RunMode,
} from '../game/types';
import {
  acceptForRun,
  beginDirectorRequest as beginDirectorRequestState,
  createLlmDirectorState,
  failDirectorRequest as failDirectorRequestState,
  markDirectorTriggerHandled as markDirectorTriggerHandledState,
  resolveIntentEffect,
  type DirectorContentSource,
} from '../llm/directorState';
import type { IndependentEventContent, NovelBlueprintContent, TemporaryQuoteContent } from '../llm/gameContent';
import type { GameContentRequestErrorCode, GameContentTask } from '../llm/gameContentClient';
import type {
  ArchiveRecord,
  ArchiveKind,
  GameDataState,
  GenerationStatus,
  InputMode,
  MemoryDirection,
  MemoryNode,
  NarrativeOutcome,
  NotificationItem,
  TacticalDomainEvent,
  UiPreferences,
} from '../types/game';
import { migrateGameState } from './gameStateMigration';

interface GameActions {
  startRun: (seed: string, mode: RunMode, llmEnabled: boolean) => void;
  moveToNode: (nodeId: string) => void;
  useGreatsword: (action: GreatswordAction) => void;
  completeCurrentNode: (fragment?: MemoryFragment) => void;
  applyRunVitals: (sanityDelta: number, overloadDelta: number) => void;
  stabilizeMemoryCore: () => void;
  resolveFragmentChoice: (choice: FragmentOverflowChoice) => void;
  resetRun: () => void;
  beginDirectorRequest: (kind: GameContentTask, triggerKey: string) => string;
  acceptDirectorEvent: (token: string, triggerKey: string, content: IndependentEventContent, source: DirectorContentSource) => void;
  acceptDirectorQuote: (token: string, triggerKey: string, content: TemporaryQuoteContent, source: DirectorContentSource) => void;
  acceptNovelBlueprint: (token: string, triggerKey: string, content: NovelBlueprintContent, source: DirectorContentSource) => void;
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
  completeNarrativeOutcome: (outcome: NarrativeOutcome) => void;
  selectMemoryNode: (nodeId: string | null) => void;
  setMemoryView: (viewMode: 'graph' | 'list') => void;
  expandMemoryNode: (sourceId: string, direction: MemoryDirection) => MemoryNode | null;
  setArchiveView: (view: 'records' | 'relations' | 'reasoning') => void;
  setArchiveQuery: (query: string) => void;
  setArchiveKindFilter: (kindFilter: ArchiveKind | '全部') => void;
  setArchiveSort: (sort: '最近更新' | '可信度') => void;
  toggleArchivePin: (recordId: string) => void;
  saveArchiveNote: (recordId: string, note: string) => void;
  markArchiveRead: (recordId: string) => void;
  linkArchiveRecords: (sourceId: string, targetId: string) => void;
  setUiPreference: <K extends keyof UiPreferences>(key: K, value: UiPreferences[K]) => void;
  setOperatorStress: (operatorId: string, stress: number) => void;
  addArchiveRecord: (record: ArchiveRecord) => void;
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
  };
}

function applyRoguelikeState(
  state: GameStore,
  next: RoguelikeState,
  events: RuleEvent[],
): Partial<GameStore> {
  const operator = state.operators.byId.rosmontis;
  return {
    run: next.run,
    maze: next.maze,
    rosmontis: next.rosmontis,
    memoryInventory: next.memoryInventory,
    progression: next.progression,
    randomState: next.randomState,
    ruleLog: [...state.ruleLog, ...events],
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
    llmDirector: state.llmDirector,
    session: state.session,
    narrative: state.narrative,
    memoryMap: state.memoryMap,
    operators: state.operators,
    archive: state.archive,
    actionLog: state.actionLog,
    tavernProjection: state.tavernProjection,
    ui,
  };
}

function stableDomainId(sessionId: string, messageId: string, type: string) {
  const source = `${sessionId}:${messageId}:${type}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `tavern-${type.replace(/\W+/g, '-')}-${(hash >>> 0).toString(36)}`;
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
  const projectedNodeIds = new Set(state.memoryMap.nodes.filter((node) => node.sourceSessionId).map((node) => node.id));
  const projectedRecordIds = new Set(state.archive.records.filter((record) => record.sourceSessionId).map((record) => record.id));
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
    memoryMap: {
      ...state.memoryMap,
      selectedNodeId: projectedNodeIds.has(state.memoryMap.selectedNodeId ?? '') ? null : state.memoryMap.selectedNodeId,
      nodes: state.memoryMap.nodes.filter((node) => !node.sourceSessionId),
      edges: state.memoryMap.edges.filter((edge) => !projectedNodeIds.has(edge.sourceId) && !projectedNodeIds.has(edge.targetId)),
    },
    archive: {
      ...state.archive,
      records: state.archive.records.filter((record) => !record.sourceSessionId),
      links: state.archive.links.filter((link) => !projectedRecordIds.has(link.sourceId) && !projectedRecordIds.has(link.targetId)),
    },
    actionLog: state.actionLog.filter((entry) => !entry.sourceSessionId),
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

  if (event.type === 'memory.node.discovered') {
    const id = stableDomainId(sessionId, event.sourceMessageId, 'memory');
    const offset = Number.parseInt(id.slice(-3), 36) || 0;
    const node: MemoryNode = {
      id,
      title: event.title,
      layer: event.layer ?? '深层潜意识',
      risk: event.risk,
      hostileCount: event.hostileCount ?? null,
      alliedCount: event.alliedCount ?? 0,
      exploration: 0,
      anchored: false,
      x: 15 + (offset % 70),
      y: 58 + (offset % 25),
      summary: event.summary ?? '该意识坐标由当前会话回合投影，环境数据等待进一步扫描。',
      effects: event.effects ?? ['回合投影未复核'],
      intelligence: event.intelligence ?? ['变量证据已与来源消息绑定'],
      updatedAt: timestamp(),
      ...source,
    };
    return {
      ...state,
      memoryMap: {
        ...state.memoryMap,
        nodes: [...state.memoryMap.nodes.filter((item) => item.id !== id), node],
      },
    };
  }

  if (event.type === 'archive.clue.discovered' || event.type === 'archive.npc.discovered') {
    const kind = event.type === 'archive.clue.discovered' ? '线索' : '人物';
    const id = stableDomainId(sessionId, event.sourceMessageId, event.type === 'archive.clue.discovered' ? 'clue' : 'npc');
    const record: ArchiveRecord = {
      id,
      code: `${kind === '线索' ? 'CLUE' : 'NPC'} / ${id.slice(-4).toUpperCase()}`,
      kind,
      title: event.title,
      summary: event.summary ?? '本条情报由 LLM 回合变量自动建档，待玩家复核。',
      sourceEntryId: `tavern:${sessionId}:${event.sourceMessageId}`,
      discoveredIn: '当前会话 / LLM 回合',
      discoveredBy: '战术终端',
      confidence: event.confidence ?? 50,
      contamination: event.risk ?? 'C',
      verification: '未验证',
      relatedIds: [],
      note: '等待复核；原始变量已保留在会话快照中。',
      pinned: false,
      unread: true,
      updatedAt: timestamp(),
      ...source,
    };
    return {
      ...state,
      archive: {
        ...state.archive,
        records: [...state.archive.records.filter((item) => item.id !== id), record],
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

  if (event.type !== 'log.turn.completed') return state;
  const id = stableDomainId(sessionId, event.sourceMessageId, 'turn-log');
  return {
    ...state,
    actionLog: [
      ...state.actionLog.filter((entry) => entry.id !== id),
      {
        id,
        kind: '状态变化',
        title: '酒馆回合完成',
        summary: event.summary,
        timestamp: timestamp(),
        actor: '战术叙事系统',
        chapter: state.session.chapter,
        sourceEntryId: `tavern:${sessionId}:${event.sourceMessageId}`,
        relatedPath: `/operation?session=${encodeURIComponent(sessionId)}&message=${encodeURIComponent(event.sourceMessageId)}`,
        ...source,
      },
    ],
  };
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
      startRun: (seed, mode, llmEnabled) =>
        set((state) => {
          const next = createRun({ seed, mode, progression: state.progression, llmEnabled });
          return {
            ...applyRoguelikeState(state, next, []),
            ruleLog: [],
            llmDirector: createLlmDirectorState(next.run.id),
          };
        }),
      moveToNode: (nodeId) =>
        set((state) => {
          const resolution = reduceRunAction(selectRoguelikeState(state), { type: 'move-to-node', nodeId });
          return resolution.accepted ? applyRoguelikeState(state, resolution.state, resolution.events) : state;
        }),
      useGreatsword: (action) =>
        set((state) => {
          const resolution = reduceRunAction(selectRoguelikeState(state), { type: 'use-greatsword', action });
          return resolution.accepted ? applyRoguelikeState(state, resolution.state, resolution.events) : state;
        }),
      completeCurrentNode: (fragment) =>
        set((state) => {
          const resolution = reduceRunAction(selectRoguelikeState(state), { type: 'complete-node', fragment });
          return resolution.accepted ? applyRoguelikeState(state, resolution.state, resolution.events) : state;
        }),
      applyRunVitals: (sanityDelta, overloadDelta) =>
        set((state) => {
          const resolution = reduceRunAction(selectRoguelikeState(state), {
            type: 'apply-vitals',
            sanityDelta,
            overloadDelta,
          });
          return resolution.accepted ? applyRoguelikeState(state, resolution.state, resolution.events) : state;
        }),
      stabilizeMemoryCore: () =>
        set((state) => {
          const resolution = reduceRunAction(selectRoguelikeState(state), { type: 'stabilize-core' });
          return resolution.accepted ? applyRoguelikeState(state, resolution.state, resolution.events) : state;
        }),
      resolveFragmentChoice: (choice) =>
        set((state) => {
          const resolution = reduceRunAction(selectRoguelikeState(state), { type: 'resolve-fragment-overflow', choice });
          return resolution.accepted ? applyRoguelikeState(state, resolution.state, resolution.events) : state;
        }),
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
      acceptNovelBlueprint: (token, triggerKey, content, source) =>
        set((state) => ({
          llmDirector: acceptForRun(state.llmDirector, state.run.id, 'novel', token, (director) => ({
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
          const effect = resolveIntentEffect(choice.intent, state.rosmontis);
          const resolution = reduceRunAction(selectRoguelikeState(state), { type: 'apply-vitals', ...effect });
          if (!resolution.accepted) return state;
          return {
            ...applyRoguelikeState(state, resolution.state, resolution.events),
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
          actionLog: [
            ...state.actionLog,
            {
              id: `log-command-${entryId}`,
              kind: '指令',
              title: command,
              summary: `以“${state.narrative.inputMode}”模式提交至本地叙事引擎。`,
              timestamp: '03:30:58',
              actor: '玩家',
              chapter: '第一章',
              sourceEntryId: entryId,
            },
          ],
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
      completeNarrativeOutcome: (outcome) =>
        set((state) => {
          const alreadyCompleted = state.narrative.entries.some(
            (entry) => entry.id === outcome.entryId && entry.kind === '检定',
          );
          if (alreadyCompleted) return state;

          const rosmontis = state.operators.byId.rosmontis;
          const hasNode = state.memoryMap.nodes.some((node) => node.id === outcome.unlockedNodeId);
          const hasEdge = state.memoryMap.edges.some((edge) => edge.targetId === outcome.unlockedNodeId);
          const hasClue = state.archive.records.some((record) => record.id === outcome.archiveRecordId);

          return {
            narrative: {
              ...state.narrative,
              draft: '',
              generationStatus: 'complete',
              activeEntryId: null,
              entries: state.narrative.entries.map((entry) =>
                entry.id === outcome.entryId
                  ? {
                      ...entry,
                      kind: '检定',
                      title: `感知检定成功 / ${outcome.checkTotal}`,
                      check: {
                        attribute: '感知',
                        roll: 16,
                        modifier: 2,
                        total: outcome.checkTotal,
                        difficulty: 15,
                        result: '成功',
                      },
                      relatedIds: [outcome.archiveRecordId, outcome.unlockedNodeId],
                    }
                  : entry,
              ),
            },
            operators: {
              ...state.operators,
              byId: {
                ...state.operators.byId,
                rosmontis: rosmontis ? { ...rosmontis, stress: outcome.operatorStress } : rosmontis,
              },
            },
            memoryMap: {
              ...state.memoryMap,
              nodes: hasNode ? state.memoryMap.nodes : [...state.memoryMap.nodes, { ...deepMemoryNode }],
              edges: hasEdge
                ? state.memoryMap.edges
                : [
                    ...state.memoryMap.edges,
                    {
                      id: 'edge-r09-deep-chorus',
                      sourceId: 'memory-r09',
                      targetId: deepMemoryNode.id,
                      state: 'unresolved',
                    },
                  ],
            },
            archive: {
              ...state.archive,
              records: hasClue
                ? state.archive.records
                : [...state.archive.records, { ...deepMemoryClue, relatedIds: [...deepMemoryClue.relatedIds] }],
            },
            actionLog: [
              ...state.actionLog,
              {
                id: 'log-check-deep-chorus',
                kind: '检定',
                title: '感知检定成功',
                summary: '迷迭香识别出复数儿童意识回声。',
                timestamp: '03:31:44',
                actor: '迷迭香',
                chapter: '第一章',
                sourceEntryId: outcome.entryId,
              },
              {
                id: 'log-node-deep-chorus',
                kind: '节点解锁',
                title: deepMemoryNode.title,
                summary: '向深层潜意识的未解析路径已经建立。',
                timestamp: '03:31:45',
                actor: '系统',
                chapter: '第一章',
                relatedPath: '/memory',
              },
            ],
            ui: {
              ...state.ui,
              notifications: [
                ...state.ui.notifications,
                {
                  id: 'notification-stress-rise',
                  kind: 'warning',
                  title: '精神负荷升高',
                  message: `迷迭香精神负荷已升至 ${outcome.operatorStress}，建议下一行动保持医疗监测。`,
                  actionLabel: '查看干员状态',
                  actionTarget: '/operators',
                  dismissible: true,
                },
              ],
            },
          };
        }),
      selectMemoryNode: (nodeId) =>
        set((state) => ({ memoryMap: { ...state.memoryMap, selectedNodeId: nodeId } })),
      setMemoryView: (viewMode) =>
        set((state) => ({ memoryMap: { ...state.memoryMap, viewMode } })),
      expandMemoryNode: (sourceId, direction) => {
        let createdNode: MemoryNode | null = null;
        set((state) => {
          const source = state.memoryMap.nodes.find((node) => node.id === sourceId);
          if (!source) return state;

          const suffix = direction === 'down' ? 'deep' : direction;
          const nodeId = `memory-expanded-${sourceId}-${suffix}`;
          const existing = state.memoryMap.nodes.find((node) => node.id === nodeId);
          if (existing) {
            createdNode = existing;
            return {
              memoryMap: { ...state.memoryMap, selectedNodeId: existing.id },
              ui: {
                ...state.ui,
                notifications: [
                  ...state.ui.notifications,
                  {
                    id: `notification-path-existing-${suffix}`,
                    kind: 'warning',
                    title: '路径已经存在',
                    message: '该方向的意识坐标已完成标定，终端已重新选中对应节点。',
                    dismissible: true,
                  },
                ],
              },
            };
          }

          const profile = {
            down: {
              title: '沉没的儿童诊疗层',
              layer: '深层潜意识' as const,
              risk: 'A' as const,
              hostileCount: 2,
              x: source.x,
              y: Math.min(88, source.y + 35),
              summary: '向下坠落的走廊由重复病历构成，意识回声正在主动重写门牌编号。',
              effects: ['精神负荷增幅', '路径不可逆'],
            },
            left: {
              title: '逆流的地下档案室',
              layer: '未知战局' as const,
              risk: 'B' as const,
              hostileCount: null,
              x: Math.max(8, source.x - 31),
              y: Math.min(84, source.y + 16),
              summary: '文件柜沿反重力方向延伸，所有索引都指向尚未发生的撤离记录。',
              effects: ['空间方位翻转'],
            },
            right: {
              title: '雨停后的空白病区',
              layer: '未知战局' as const,
              risk: 'B' as const,
              hostileCount: 1,
              x: Math.min(91, source.x + 19),
              y: Math.min(84, source.y + 19),
              summary: '病区没有雨声，现实边界因此出现大面积缺失，远处有一道人形轮廓。',
              effects: ['环境信息缺损'],
            },
          }[direction];

          createdNode = {
            id: nodeId,
            title: profile.title,
            layer: profile.layer,
            risk: profile.risk,
            hostileCount: profile.hostileCount,
            alliedCount: 0,
            exploration: 0,
            anchored: false,
            x: profile.x,
            y: profile.y,
            summary: profile.summary,
            effects: profile.effects,
            intelligence: ['环境数据等待首次扫描'],
            updatedAt: '03:33:08',
          };

          return {
            memoryMap: {
              ...state.memoryMap,
              selectedNodeId: nodeId,
              nodes: [...state.memoryMap.nodes, createdNode],
              edges: [
                ...state.memoryMap.edges,
                {
                  id: `edge-${sourceId}-${suffix}`,
                  sourceId,
                  targetId: nodeId,
                  state: direction === 'down' ? 'polluted' : 'unresolved',
                },
              ],
            },
            actionLog: [
              ...state.actionLog,
              {
                id: `log-memory-expand-${suffix}`,
                kind: '节点解锁',
                title: profile.title,
                summary: `${source.title}向${direction === 'down' ? '深层潜意识' : '未知战局'}的路径已完成标定。`,
                timestamp: '03:33:08',
                actor: '系统',
                chapter: '第一章',
                relatedPath: '/memory',
              },
            ],
            ui: {
              ...state.ui,
              notifications: [
                ...state.ui.notifications,
                {
                  id: `notification-path-created-${suffix}`,
                  kind: 'success',
                  title: '路径已建立',
                  message: `新节点“${profile.title}”已写入意识战场，等待迷迭香确认进入。`,
                  dismissible: true,
                },
              ],
            },
          };
        });
        return createdNode;
      },
      setArchiveView: (view) =>
        set((state) => ({ archive: { ...state.archive, view } })),
      setArchiveQuery: (query) =>
        set((state) => ({ archive: { ...state.archive, query } })),
      setArchiveKindFilter: (kindFilter) =>
        set((state) => ({ archive: { ...state.archive, kindFilter } })),
      setArchiveSort: (sort) =>
        set((state) => ({ archive: { ...state.archive, sort } })),
      toggleArchivePin: (recordId) =>
        set((state) => ({
          archive: {
            ...state.archive,
            records: state.archive.records.map((record) =>
              record.id === recordId ? { ...record, pinned: !record.pinned } : record,
            ),
          },
        })),
      saveArchiveNote: (recordId, note) =>
        set((state) => ({
          archive: {
            ...state.archive,
            records: state.archive.records.map((record) =>
              record.id === recordId ? { ...record, note, updatedAt: '03:34:12' } : record,
            ),
          },
          ui: {
            ...state.ui,
            notifications: [
              ...state.ui.notifications,
              {
                id: `notification-note-saved-${recordId}`,
                kind: 'success',
                title: '批注已保存',
                message: '玩家批注已写入本地档案，不会覆盖 LLM 生成的原始情报。',
                dismissible: true,
              },
            ],
          },
        })),
      markArchiveRead: (recordId) =>
        set((state) => ({
          archive: {
            ...state.archive,
            records: state.archive.records.map((record) =>
              record.id === recordId ? { ...record, unread: false } : record,
            ),
          },
        })),
      linkArchiveRecords: (sourceId, targetId) =>
        set((state) => {
          if (sourceId === targetId) return state;
          const id = `link-user-${sourceId}-${targetId}`;
          if (state.archive.links.some((link) => link.id === id)) return state;
          return {
            archive: {
              ...state.archive,
              links: [...state.archive.links, { id, sourceId, targetId, relation: '支持' }],
            },
            ui: {
              ...state.ui,
              notifications: [
                ...state.ui.notifications,
                {
                  id: `notification-link-${sourceId}-${targetId}`,
                  kind: 'success',
                  title: '关联已建立',
                  message: '两份档案已建立“支持”关系，可在关系视图中复核。',
                  actionLabel: '撤销需在详情中处理',
                  dismissible: true,
                },
              ],
            },
          };
        }),
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
      addArchiveRecord: (record) =>
        set((state) => ({
          archive: {
            ...state.archive,
            records: state.archive.records.some((item) => item.id === record.id)
              ? state.archive.records
              : [...state.archive.records, { ...record, relatedIds: [...record.relatedIds] }],
          },
        })),
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
      version: 3,
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
