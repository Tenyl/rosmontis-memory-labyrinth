export type RunMode = 'preset' | 'endless' | 'novel';
export type RunPhase = 'idle' | 'exploring' | 'resolving' | 'fragment-overflow' | 'victory' | 'defeat';
export type MazeNodeType = 'combat' | 'rest' | 'shop' | 'wonder' | 'unknown' | 'boss';
export type HiddenMazeNodeType = Exclude<MazeNodeType, 'unknown' | 'boss'>;
export type MazeRisk = 'C' | 'B' | 'A' | 'S';
export type MazeNodeState = 'hidden' | 'detected' | 'reachable' | 'current' | 'completed' | 'corrupted';
export type GreatswordId = 'breach' | 'watch' | 'perception' | 'resonance';
export type GreatswordTarget = 'hostile' | 'self' | 'maze' | 'memory';
export type ModuleId =
  | 'breach-circuit'
  | 'watch-prism'
  | 'perception-array'
  | 'resonance-wire'
  | 'overload-filter'
  | 'memory-cache'
  | 'echo-recycler'
  | 'white-noise';

export interface CognitiveModule {
  id: ModuleId;
  name: string;
  rarity: 'common' | 'rare';
  description: string;
}

export interface EconomyState {
  echoes: number;
  scoutPoints: number;
  shopPurchases: string[];
}

export interface SeededRandomState {
  seed: string;
  cursor: number;
  draws: number;
}

export interface RunState {
  id: string;
  seed: string;
  mode: RunMode;
  phase: RunPhase;
  turn: number;
  floor: number;
  currentNodeId: string;
  result: 'victory' | 'defeat' | null;
}

export type D20Outcome = 'critical-failure' | 'failure' | 'success' | 'critical-success';

export interface D20CheckInput {
  attribute: string;
  modifier: number;
  difficulty: number;
}

export interface D20CheckResult extends D20CheckInput {
  roll: number;
  total: number;
  outcome: D20Outcome;
  passed: boolean;
}

export type RuleEvent =
  | {
      type: 'check.resolved';
      attribute: string;
      roll: number;
      total: number;
      difficulty: number;
      outcome: D20Outcome;
    }
  | {
      type: 'greatsword.used';
      swordId: GreatswordId;
      actionPointCost: number;
      overloadDelta: number;
      cooldown: number;
    }
  | { type: 'fragment.acquired'; fragmentId: string; kind: 'standard' | 'core' }
  | { type: 'fragment.overflow'; fragmentId: string }
  | { type: 'fragment.discarded'; fragmentId: string }
  | { type: 'fragment.replaced'; forgottenFragmentId: string; acquiredFragmentId: string }
  | { type: 'run.moved'; sourceNodeId: string; targetNodeId: string }
  | { type: 'node.completed'; nodeId: string }
  | { type: 'economy.echoes-changed'; delta: number; balance: number }
  | { type: 'module.acquired'; moduleId: ModuleId }
  | { type: 'fragment.sold'; fragmentId: string; echoes: number }
  | { type: 'run.ended'; result: 'victory' | 'defeat' };

export interface GreatswordCombatState {
  actionPoints: number;
  sanity: number;
  overload: number;
  guard: number;
  insight: number;
  enemyIntegrity: number;
  coreStability: number;
  greatswords: Record<GreatswordId, { cooldown: number }>;
}

export interface GreatswordAction {
  swordId: GreatswordId;
  target: GreatswordTarget;
  nodeType: MazeNodeType;
}

export interface MemoryFragment {
  id: string;
  name: string;
  kind: 'standard' | 'core';
  tags: string[];
}

export interface MemoryInventory {
  capacity: number;
  fragments: MemoryFragment[];
  coreFragments: MemoryFragment[];
  pendingFragment: MemoryFragment | null;
}

export interface EconomyRuleState {
  economy: EconomyState;
  modules: ModuleId[];
  memoryInventory: MemoryInventory;
}

export interface ModuleShopOffer {
  id: string;
  kind: 'module';
  moduleId: ModuleId;
  price: number;
}

export type ExplorationCharges = Record<GreatswordId, 0 | 1>;

export interface RouteEffects {
  nextNodeGuarded: boolean;
  shopDiscount: number;
  bossGlitchSuppressed: boolean;
  resonanceActive: boolean;
  freeScoutUsed: boolean;
}

export interface EncounterChoice {
  id: string;
  label: string;
  description: string;
  requiredTag?: string;
  requiresResonance?: boolean;
}

interface EncounterBase {
  nodeId: string;
  resolved: boolean;
  choices: EncounterChoice[];
}

export type PendingEncounter =
  | (EncounterBase & {
      kind: 'combat';
      round: number;
      maxRounds: number;
      enemyIntegrity: number;
      rewardEchoes: number;
    })
  | (EncounterBase & { kind: 'rest' })
  | (EncounterBase & { kind: 'shop'; offers: ModuleShopOffer[] })
  | (EncounterBase & { kind: 'wonder' })
  | (EncounterBase & {
      kind: 'unknown';
      hiddenType: HiddenMazeNodeType;
      glitch: boolean;
      directEntryBonus: number;
    })
  | (EncounterBase & {
      kind: 'boss';
      phase: 'shield' | 'stability';
      enemyIntegrity: number;
      coreStability: number;
      glitch: boolean;
    });

export interface EncounterRuleState extends RoguelikeState {
  economy: EconomyState;
  modules: ModuleId[];
  routeEffects: RouteEffects;
  pendingEncounter: PendingEncounter | null;
}

export interface ExplorationRuleState {
  maze: MazeGraph;
  economy: EconomyState;
  modules: ModuleId[];
  explorationCharges: ExplorationCharges;
  routeEffects: RouteEffects;
  currentNodeId: string;
}

export interface FragmentRuleState {
  phase: RunPhase;
  inventory: MemoryInventory;
}

export type FragmentOverflowChoice =
  | { type: 'discard-pending' }
  | { type: 'replace'; fragmentId: string };

export interface ProgressionState {
  firstClear: boolean;
  completedRuns: number;
}

export interface RoguelikeState {
  run: RunState;
  maze: MazeGraph;
  rosmontis: GreatswordCombatState;
  memoryInventory: MemoryInventory;
  progression: ProgressionState;
  randomState: SeededRandomState;
}

export type RunAction =
  | { type: 'move-to-node'; nodeId: string }
  | { type: 'complete-node'; fragment?: MemoryFragment }
  | { type: 'use-greatsword'; action: GreatswordAction }
  | { type: 'resolve-fragment-overflow'; choice: FragmentOverflowChoice }
  | { type: 'apply-vitals'; sanityDelta: number; overloadDelta: number }
  | { type: 'stabilize-core' };

export interface MazeNode {
  id: string;
  type: MazeNodeType;
  state: MazeNodeState;
  floor: number;
  depth: number;
  risk: MazeRisk;
  hiddenType: HiddenMazeNodeType | null;
  revealed: boolean;
  modifiers: string[];
}

export interface MazeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  locked: boolean;
}

export interface MazeGraph {
  seed: string;
  mode: RunMode;
  floor: number;
  maxFloor: number;
  startNodeId: string;
  coreNodeId: string;
  nodes: MazeNode[];
  edges: MazeEdge[];
  randomState: SeededRandomState;
}
