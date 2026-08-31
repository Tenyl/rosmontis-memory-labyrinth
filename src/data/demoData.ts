import type {
  GameDataState,
  Operator,
} from '../types/game';
import { createRun } from '../game/run';
import { createDiarySlice } from '../store/slices/diarySlice';
import { createInventorySlice } from '../store/slices/inventorySlice';
import { createLlmDirectorSlice } from '../store/slices/llmDirectorSlice';
import { createMazeSlice } from '../store/slices/mazeSlice';
import { createRosmontisSlice } from '../store/slices/rosmontisSlice';
import { createRunSlice } from '../store/slices/runSlice';

const rosmontis: Operator = {
  id: 'rosmontis',
  name: '迷迭香',
  code: 'ELITE / RSM-04',
  role: '意识侦察核心',
  health: 88,
  stress: 41,
  sanity: 72,
  actionPoints: 3,
  position: '前导位',
  condition: '轻度意识重叠',
  nextAction: '读取残留意识',
  attributes: [
    { label: '感知', value: 16, modifier: 2 },
    { label: '源石技艺', value: 18, modifier: 3 },
    { label: '意志', value: 15, modifier: 1 },
    { label: '战术协调', value: 12 },
  ],
  traits: ['思维感应', '重力操控', '记忆碎片捕获'],
  abilities: ['意识回声定位', '质量投射', '战术装备压制'],
  equipment: ['制式神经监测环', '四单元战术装备', '医疗应急注射器'],
  relation: '与博士的神经链路稳定；正在共同辨认记忆迷宫中的破碎回声。',
  temporaryFeatures: ['雨声触发记忆闪回'],
};

export function buildDemoState(): GameDataState {
  const roguelike = createRun({
    seed: 'PRESET-RAIN-ECHO',
    mode: 'preset',
    progression: { firstClear: false, completedRuns: 0 },
    llmEnabled: false,
  });
  return {
    ...createRunSlice(roguelike),
    ...createMazeSlice(roguelike),
    ...createRosmontisSlice(roguelike),
    ...createInventorySlice(roguelike),
    ...createDiarySlice(roguelike.pendingDiaryDrafts),
    ...createLlmDirectorSlice(roguelike.run.id),
    session: {
      operationCode: '记忆迷宫',
      chapter: '表层残响',
      phase: '探索中',
      objective: '引导迷迭香找回记忆碎片并抵达当前层出口',
      connection: '本地模拟已连接',
      globalRisk: 'B',
      squadStatus: '认知链路稳定',
    },
    narrative: {
      entries: [],
      inputMode: '行动描述',
      draft: '',
      suggestions: ['观察当前节点', '让迷迭香读取记忆回声', '命令巨剑进入守望阵位'],
      generationStatus: 'idle',
      activeEntryId: null,
      inputError: null,
    },
    operators: {
      byId: { rosmontis: { ...rosmontis } },
      squadOrder: ['rosmontis'],
      formation: '单人认知潜入',
    },
    tavernProjection: {
      activeSessionId: null,
      sessions: {},
    },
    ui: {
      activeDialog: null,
      notifications: [],
      migrationNotice: null,
      mazeViewMode: 'graph',
      preferences: {
        density: 'standard',
        textSpeed: 'standard',
        motion: 'system',
        fontSize: 'standard',
        highContrast: false,
        autosave: true,
      },
    },
  };
}
