import { clampVital } from './checks';
import { acquireFragment, resolveFragmentOverflow } from './fragments';
import { resolveGreatswordAction } from './greatswords';
import { generateMaze } from './maze';
import type {
  GreatswordCombatState,
  ProgressionState,
  RoguelikeState,
  RuleEvent,
  RunAction,
  RunMode,
} from './types';

interface CreateRunInput {
  seed: string;
  mode: RunMode;
  progression: ProgressionState;
  llmEnabled: boolean;
  floor?: number;
  targetNodeCount?: number;
}

export interface RunResolution {
  accepted: boolean;
  reason?: string;
  state: RoguelikeState;
  events: RuleEvent[];
}

export function getAvailableModes(progression: ProgressionState, llmEnabled: boolean): RunMode[] {
  const modes: RunMode[] = ['preset'];
  if (progression.firstClear) modes.push('endless');
  if (progression.firstClear && llmEnabled) modes.push('novel');
  return modes;
}

export function createRun(input: CreateRunInput): RoguelikeState {
  if (input.mode === 'novel' && !input.llmEnabled) {
    throw new Error('小说剧情模式需要先启用 LLM。');
  }
  if (!getAvailableModes(input.progression, input.llmEnabled).includes(input.mode)) {
    throw new Error('该模式尚未解锁。');
  }

  const floor = input.floor ?? 1;
  const maze = generateMaze({
    seed: input.seed,
    mode: input.mode,
    floor,
    targetNodeCount: input.targetNodeCount ?? 10,
  });
  const rosmontis: GreatswordCombatState = {
    actionPoints: 4,
    sanity: 100,
    overload: 0,
    guard: 0,
    insight: 0,
    enemyIntegrity: 100,
    coreStability: 0,
    greatswords: {
      breach: { cooldown: 0 },
      watch: { cooldown: 0 },
      perception: { cooldown: 0 },
      resonance: { cooldown: 0 },
    },
  };

  return {
    run: {
      id: `run-${maze.randomState.cursor.toString(36)}`,
      seed: input.seed,
      mode: input.mode,
      phase: 'exploring',
      turn: 1,
      floor,
      currentNodeId: maze.startNodeId,
      result: null,
    },
    maze,
    rosmontis,
    memoryInventory: {
      capacity: 3,
      fragments: [],
      coreFragments: [],
      pendingFragment: null,
    },
    progression: { ...input.progression },
    randomState: maze.randomState,
  };
}

export function reduceRunAction(state: RoguelikeState, action: RunAction): RunResolution {
  if (state.run.phase === 'fragment-overflow' && action.type !== 'resolve-fragment-overflow') {
    return rejected(state, '必须先处理记忆碎片溢出。');
  }
  if (state.run.phase === 'victory' || state.run.phase === 'defeat') {
    return rejected(state, '当前 Run 已结束。');
  }

  if (action.type === 'move-to-node') return moveToNode(state, action.nodeId);
  if (action.type === 'complete-node') return completeNode(state, action.fragment);
  if (action.type === 'use-greatsword') {
    const resolution = resolveGreatswordAction(state.rosmontis, action.action, state.randomState);
    if (!resolution.accepted) return rejected(state, resolution.reason ?? '巨剑行动无法执行。');
    const next = {
      ...state,
      rosmontis: resolution.state,
      randomState: resolution.randomState,
      run: { ...state.run, turn: state.run.turn + 1 },
    };
    return applyDefeat(next, resolution.events);
  }
  if (action.type === 'resolve-fragment-overflow') {
    const resolution = resolveFragmentOverflow({ phase: state.run.phase, inventory: state.memoryInventory }, action.choice);
    if (!resolution.accepted) return rejected(state, resolution.reason ?? '碎片选择无效。');
    return accepted({
      ...state,
      run: { ...state.run, phase: resolution.state.phase },
      memoryInventory: resolution.state.inventory,
    }, resolution.events);
  }
  if (action.type === 'apply-vitals') {
    const next = {
      ...state,
      rosmontis: {
        ...state.rosmontis,
        sanity: clampVital(state.rosmontis.sanity + action.sanityDelta),
        overload: clampVital(state.rosmontis.overload + action.overloadDelta),
      },
    };
    return applyDefeat(next, []);
  }

  if (state.run.currentNodeId !== state.maze.coreNodeId) return rejected(state, '迷迭香尚未抵达记忆核心。');
  if (state.rosmontis.coreStability < 100) return rejected(state, '记忆核心尚未稳定。');
  return accepted({
    ...state,
    run: { ...state.run, phase: 'victory', result: 'victory' },
    progression: {
      firstClear: true,
      completedRuns: state.progression.completedRuns + 1,
    },
  }, [{ type: 'run.ended', result: 'victory' }]);
}

function moveToNode(state: RoguelikeState, nodeId: string): RunResolution {
  const target = state.maze.nodes.find((node) => node.id === nodeId);
  const connected = state.maze.edges.some((edge) => (
    edge.sourceId === state.run.currentNodeId && edge.targetId === nodeId
  ));
  if (!target || !connected || target.state !== 'reachable') return rejected(state, '目标节点当前不可到达。');

  const frontier = new Set(state.maze.edges.filter((edge) => edge.sourceId === nodeId).map((edge) => edge.targetId));
  const sourceNodeId = state.run.currentNodeId;
  return accepted({
    ...state,
    run: { ...state.run, currentNodeId: nodeId, turn: state.run.turn + 1 },
    maze: {
      ...state.maze,
      nodes: state.maze.nodes.map((node) => {
        if (node.id === sourceNodeId) return { ...node, state: 'completed' };
        if (node.id === nodeId) return { ...node, state: 'current' };
        if (frontier.has(node.id) && node.state === 'hidden') return { ...node, state: 'reachable' };
        return node;
      }),
    },
  }, [{ type: 'run.moved', sourceNodeId, targetNodeId: nodeId }]);
}

function completeNode(state: RoguelikeState, fragment?: import('./types').MemoryFragment): RunResolution {
  const currentNode = state.maze.nodes.find((node) => node.id === state.run.currentNodeId);
  if (!currentNode) return rejected(state, '当前节点不存在。');
  if (currentNode.state === 'completed') return rejected(state, '当前节点已经完成结算。');

  const nodeEvent: RuleEvent = { type: 'node.completed', nodeId: state.run.currentNodeId };
  const settledState: RoguelikeState = {
    ...state,
    maze: {
      ...state.maze,
      nodes: state.maze.nodes.map((node) => (
        node.id === state.run.currentNodeId ? { ...node, state: 'completed' } : node
      )),
    },
  };
  if (!fragment) return accepted(settledState, [nodeEvent]);
  const resolution = acquireFragment({ phase: state.run.phase, inventory: state.memoryInventory }, fragment);
  if (!resolution.accepted) return rejected(state, resolution.reason ?? '无法获得记忆碎片。');
  return accepted({
    ...settledState,
    run: { ...state.run, phase: resolution.state.phase },
    memoryInventory: resolution.state.inventory,
  }, [nodeEvent, ...resolution.events]);
}

function applyDefeat(state: RoguelikeState, events: RuleEvent[]): RunResolution {
  if (state.rosmontis.sanity > 0 && state.rosmontis.overload < 100) return accepted(state, events);
  return accepted({
    ...state,
    run: { ...state.run, phase: 'defeat', result: 'defeat' },
  }, [...events, { type: 'run.ended', result: 'defeat' }]);
}

function accepted(state: RoguelikeState, events: RuleEvent[]): RunResolution {
  return { accepted: true, state, events };
}

function rejected(state: RoguelikeState, reason: string): RunResolution {
  return { accepted: false, reason, state, events: [] };
}
