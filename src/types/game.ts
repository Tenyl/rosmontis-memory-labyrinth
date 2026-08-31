import type { LlmDirectorState } from '../llm/directorState';

export type RiskLevel = 'D' | 'C' | 'B' | 'A' | 'S';
export type GenerationStatus =
  | 'idle'
  | 'parsing'
  | 'streaming'
  | 'paused'
  | 'interrupted'
  | 'complete';
export type MemoryDirection = 'left' | 'right' | 'down';
export type MemoryLayer = '表层记忆' | '深层潜意识' | '未知战局';
export type ArchiveKind = '线索' | '人物' | '地点' | '事件' | '证物';
export type InputMode = '行动描述' | '战术口令' | '状态询问';
export type NarrativeKind = '叙事' | '对白' | '扫描' | '检定' | '警报';
export type NotificationKind = 'success' | 'warning' | 'danger' | 'processing';

export interface SessionState {
  operationCode: string;
  chapter: string;
  phase: string;
  objective: string;
  connection: '本地模拟已连接' | '本地模拟已中断';
  globalRisk: RiskLevel;
  squadStatus: string;
  sourceSessionId?: string;
  sourceMessageId?: string;
  matchedLorebookEntryIds?: string[];
}

export interface CheckResult {
  attribute: string;
  roll: number;
  modifier: number;
  total: number;
  difficulty: number;
  result: '成功' | '失败';
}

export interface NarrativeEntry {
  id: string;
  index: number;
  kind: NarrativeKind;
  title: string;
  body: string;
  timestamp: string;
  speaker?: string;
  check?: CheckResult;
  relatedIds: string[];
}

export interface NarrativeState {
  entries: NarrativeEntry[];
  inputMode: InputMode;
  draft: string;
  suggestions: string[];
  generationStatus: GenerationStatus;
  activeEntryId: string | null;
  inputError: string | null;
}

export interface NarrativeOutcome {
  entryId: string;
  checkTotal: number;
  operatorStress: number;
  unlockedNodeId: string;
  archiveRecordId: string;
}

export interface NarrativeEngine {
  run(
    command: string,
    onChunk: (chunk: string) => void,
  ): Promise<NarrativeOutcome>;
  pause(): void;
  resume(): void;
  cancel(): void;
}

export interface MemoryNode {
  id: string;
  title: string;
  layer: MemoryLayer;
  risk: RiskLevel;
  hostileCount: number | null;
  alliedCount: number;
  exploration: number;
  anchored: boolean;
  x: number;
  y: number;
  summary: string;
  effects: string[];
  intelligence: string[];
  updatedAt: string;
  sourceSessionId?: string;
  sourceMessageId?: string;
  matchedLorebookEntryIds?: string[];
}

export interface MemoryEdge {
  id: string;
  sourceId: string;
  targetId: string;
  state: 'confirmed' | 'polluted' | 'unresolved';
}

export interface MemoryMapState {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
  selectedNodeId: string | null;
  viewMode: 'graph' | 'list';
  viewport: { x: number; y: number; zoom: number };
}

export interface OperatorAttribute {
  label: string;
  value: number;
  modifier?: number;
}

export interface Operator {
  id: string;
  name: string;
  code: string;
  role: string;
  health: number;
  stress: number;
  sanity?: number;
  actionPoints: number;
  position: string;
  condition: string;
  nextAction: string;
  attributes: OperatorAttribute[];
  traits: string[];
  abilities: string[];
  equipment: string[];
  relation: string;
  temporaryFeatures: string[];
  sourceSessionId?: string;
  sourceMessageId?: string;
  matchedLorebookEntryIds?: string[];
}

export interface OperatorsState {
  byId: Record<string, Operator>;
  squadOrder: string[];
  formation: string;
}

export interface ArchiveRecord {
  id: string;
  code: string;
  kind: ArchiveKind;
  title: string;
  summary: string;
  sourceEntryId: string;
  discoveredIn: string;
  discoveredBy: string;
  confidence: number;
  contamination: RiskLevel;
  verification: '已验证' | '部分验证' | '未验证' | '存在冲突';
  relatedIds: string[];
  note: string;
  pinned: boolean;
  unread: boolean;
  updatedAt: string;
  sourceSessionId?: string;
  sourceMessageId?: string;
  matchedLorebookEntryIds?: string[];
}

export interface ArchiveLink {
  id: string;
  sourceId: string;
  targetId: string;
  relation: '支持' | '冲突' | '出现于' | '指向';
}

export interface ArchiveState {
  records: ArchiveRecord[];
  links: ArchiveLink[];
  view: 'records' | 'relations' | 'reasoning';
  query: string;
  kindFilter: ArchiveKind | '全部';
  sort: '最近更新' | '可信度';
}

export interface ActionLogEntry {
  id: string;
  kind: '章节' | '指令' | '检定' | '状态变化' | '节点解锁' | '情报入库';
  title: string;
  summary: string;
  timestamp: string;
  actor: string;
  chapter: string;
  sourceEntryId?: string;
  relatedPath?: string;
  sourceSessionId?: string;
  sourceMessageId?: string;
  matchedLorebookEntryIds?: string[];
}

export type TacticalDomainEvent = (
  | { type: 'operator.stress.changed'; operatorId: string; value: number; sourceMessageId: string }
  | { type: 'operator.sanity.changed'; operatorId: string; value: number; sourceMessageId: string }
  | {
      type: 'memory.node.discovered';
      title: string;
      risk: RiskLevel;
      summary?: string;
      layer?: MemoryLayer;
      hostileCount?: number | null;
      alliedCount?: number;
      effects?: string[];
      intelligence?: string[];
      sourceMessageId: string;
    }
  | {
      type: 'archive.clue.discovered' | 'archive.npc.discovered';
      title: string;
      summary?: string;
      confidence?: number;
      risk?: RiskLevel;
      sourceMessageId: string;
    }
  | { type: 'session.risk.changed'; value: RiskLevel; sourceMessageId: string }
  | { type: 'session.objective.changed'; value: string; sourceMessageId: string }
  | { type: 'squad.status.changed'; value: string; sourceMessageId: string }
  | { type: 'log.turn.completed'; summary: string; sourceMessageId: string }
) & { matchedLorebookEntryIds?: string[] };

export interface TavernProjectionSnapshot {
  processedMessageIds: string[];
  events: TacticalDomainEvent[];
}

export interface TavernProjectionState {
  activeSessionId: string | null;
  sessions: Record<string, TavernProjectionSnapshot>;
}

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  actionLabel?: string;
  actionTarget?: string;
  dismissible?: boolean;
}

export interface UiPreferences {
  density: 'comfortable' | 'standard' | 'compact';
  textSpeed: 'instant' | 'standard' | 'immersive';
  motion: 'full' | 'reduced' | 'system';
  fontSize: 'standard' | 'large' | 'xlarge';
  highContrast: boolean;
  autosave: boolean;
}

export interface UiState {
  sidebarCollapsed: boolean;
  activeDialog: string | null;
  notifications: NotificationItem[];
  migrationNotice: 'three-to-five-floors' | null;
  preferences: UiPreferences;
}

export interface MemoryCompendiumEntry {
  id: string;
  name: string;
  kind: 'standard' | 'core';
  tags: string[];
  discoveredRunId: string;
  discoveries: number;
}

export interface RunHistoryRecord {
  id: string;
  runId: string;
  seed: string;
  mode: RunMode;
  result: 'victory' | 'defeat';
  floor: number;
  turns: number;
  completedNodes: number;
  fragmentsRecovered: number;
  finalSanity: number;
  finalOverload: number;
  recordedAt: string;
}

export interface PendingDiaryDraft {
  id: string;
  triggerKey: string;
  title: string;
  body: string;
  source: 'local' | 'remote';
  createdAt: string;
}

export interface GameDataState {
  run: RunState;
  maze: MazeGraph;
  rosmontis: GreatswordCombatState;
  memoryInventory: MemoryInventory;
  progression: ProgressionState;
  ruleLog: RuleEvent[];
  randomState: SeededRandomState;
  economy: EconomyState;
  modules: ModuleId[];
  explorationCharges: ExplorationCharges;
  routeEffects: RouteEffects;
  pendingEncounter: PendingEncounter | null;
  llmDirector: LlmDirectorState;
  memoryCompendium: MemoryCompendiumEntry[];
  runHistory: RunHistoryRecord[];
  pendingDiaryDrafts: PendingDiaryDraft[];
  session: SessionState;
  narrative: NarrativeState;
  memoryMap: MemoryMapState;
  operators: OperatorsState;
  archive: ArchiveState;
  actionLog: ActionLogEntry[];
  tavernProjection: TavernProjectionState;
  ui: UiState;
}
import type {
  EconomyState,
  ExplorationCharges,
  GreatswordCombatState,
  MazeGraph,
  MemoryInventory,
  ModuleId,
  PendingEncounter,
  ProgressionState,
  RuleEvent,
  RunMode,
  RunState,
  RouteEffects,
  SeededRandomState,
} from '../game/types';
