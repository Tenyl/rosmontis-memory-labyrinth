import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { buildDemoState, deepMemoryClue, deepMemoryNode } from '../data/demoData';
import type {
  ArchiveRecord,
  GameDataState,
  GenerationStatus,
  InputMode,
  NarrativeOutcome,
  NotificationItem,
} from '../types/game';

interface GameActions {
  setNarrativeDraft: (draft: string) => void;
  setInputMode: (inputMode: InputMode) => void;
  setGenerationStatus: (generationStatus: GenerationStatus) => void;
  setInputError: (inputError: string | null) => void;
  startGeneratedEntry: (command: string, entryId: string) => void;
  appendGeneratedChunk: (entryId: string, chunk: string) => void;
  completeNarrativeOutcome: (outcome: NarrativeOutcome) => void;
  setOperatorStress: (operatorId: string, stress: number) => void;
  addArchiveRecord: (record: ArchiveRecord) => void;
  addNotification: (item: NotificationItem) => void;
  dismissNotification: (notificationId: string) => void;
  resetDemoState: () => void;
}

export type GameStore = GameDataState & GameActions;

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      ...buildDemoState(),
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
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,
        narrative: state.narrative,
        memoryMap: state.memoryMap,
        operators: state.operators,
        archive: state.archive,
        actionLog: state.actionLog,
        ui: { ...state.ui, activeDialog: null, notifications: [] },
      }),
    },
  ),
);
