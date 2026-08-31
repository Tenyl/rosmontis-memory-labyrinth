import type { LlmDirectorState } from '../llm/directorState';

export type RiskLevel = 'D' | 'C' | 'B' | 'A' | 'S';
export type GenerationStatus =
  | 'idle'
  | 'parsing'
  | 'streaming'
  | 'paused'
  | 'interrupted'
  | 'complete';
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

export type TacticalDomainEvent = (
  | { type: 'operator.stress.changed'; operatorId: string; value: number; sourceMessageId: string }
  | { type: 'operator.sanity.changed'; operatorId: string; value: number; sourceMessageId: string }
  | { type: 'session.risk.changed'; value: RiskLevel; sourceMessageId: string }
  | { type: 'session.objective.changed'; value: string; sourceMessageId: string }
  | { type: 'squad.status.changed'; value: string; sourceMessageId: string }
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
  activeDialog: string | null;
  notifications: NotificationItem[];
  migrationNotice: 'three-to-five-floors' | null;
  mazeViewMode: 'graph' | 'list';
  preferences: UiPreferences;
}

export interface MemoryCompendiumEntry {
  id: string;
  name: string;
  kind: MemoryFragmentKind;
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

export type PendingDiaryDraft = DiaryDraft;

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
  operators: OperatorsState;
  tavernProjection: TavernProjectionState;
  ui: UiState;
}
import type {
  EconomyState,
  DiaryDraft,
  ExplorationCharges,
  GreatswordCombatState,
  MazeGraph,
  MemoryInventory,
  MemoryFragmentKind,
  ModuleId,
  PendingEncounter,
  ProgressionState,
  RuleEvent,
  RunMode,
  RunState,
  RouteEffects,
  SeededRandomState,
} from '../game/types';
