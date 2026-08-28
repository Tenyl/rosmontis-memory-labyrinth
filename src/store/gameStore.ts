import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { buildDemoState, deepMemoryClue, deepMemoryNode } from '../data/demoData';
import type {
  ArchiveRecord,
  GameDataState,
  GenerationStatus,
  InputMode,
  MemoryDirection,
  MemoryNode,
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
  selectMemoryNode: (nodeId: string | null) => void;
  setMemoryView: (viewMode: 'graph' | 'list') => void;
  expandMemoryNode: (sourceId: string, direction: MemoryDirection) => MemoryNode | null;
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
                  message: `新节点“${profile.title}”已写入意识战场，等待小队确认进入。`,
                  dismissible: true,
                },
              ],
            },
          };
        });
        return createdNode;
      },
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
