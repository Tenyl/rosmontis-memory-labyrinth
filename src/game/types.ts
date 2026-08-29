export type RunMode = 'preset' | 'endless' | 'novel';
export type RunPhase = 'idle' | 'exploring' | 'resolving' | 'fragment-overflow' | 'victory' | 'defeat';
export type MazeNodeType = 'echo-combat' | 'blank-event' | 'thought-rest' | 'memory-core';
export type MazeNodeState = 'hidden' | 'detected' | 'reachable' | 'current' | 'completed' | 'corrupted';
export type GreatswordId = 'breach' | 'watch' | 'perception' | 'resonance';
export type GreatswordTarget = 'hostile' | 'self' | 'maze' | 'memory';

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
  | { type: 'fragment.replaced'; forgottenFragmentId: string; acquiredFragmentId: string };

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

export interface FragmentRuleState {
  phase: RunPhase;
  inventory: MemoryInventory;
}

export type FragmentOverflowChoice =
  | { type: 'discard-pending' }
  | { type: 'replace'; fragmentId: string };

export interface MazeNode {
  id: string;
  type: MazeNodeType;
  state: MazeNodeState;
  floor: number;
  depth: number;
}

export interface MazeEdge {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface MazeGraph {
  seed: string;
  mode: RunMode;
  floor: number;
  startNodeId: string;
  coreNodeId: string;
  nodes: MazeNode[];
  edges: MazeEdge[];
  randomState: SeededRandomState;
}
