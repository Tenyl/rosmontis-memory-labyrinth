import { clampVital } from './checks';
import { createEncounter } from './encounters';
import { resolveEncounterAction } from './encounterProtocol';
import { spendScoutPoint, useExplorationPower } from './exploration';
import { acquireFragment, resolveFragmentOverflow } from './fragments';
import { applyFragmentEffects } from './fragmentCatalog';
import { resolveGreatswordAction } from './greatswords';
import { generateMaze } from './maze';
import type {
  AiFailurePolicy,
  ContentMode,
  GreatswordCombatState,
  EncounterAction,
  MemoryFragment,
  NarrativeStyle,
  ProgressionState,
  RoguelikeState,
  RuleEvent,
  RunAction,
  RunAiBinding,
  RunMode,
} from './types';

export interface RunContentConfiguration {
  runId?: string;
  contentMode?: ContentMode;
  narrativeStyle?: NarrativeStyle;
  aiFailurePolicy?: AiFailurePolicy;
  aiBinding?: Partial<RunAiBinding>;
}

interface CreateRunInput extends RunContentConfiguration {
  seed: string;
  mode: RunMode;
  progression: ProgressionState;
  llmEnabled: boolean;
  floor?: number;
  maxFloor?: number;
  targetNodeCount?: number;
  manualStart?: boolean;
}

const MAX_ACTION_POINTS = 4;
const CORE_FRAGMENT_STABILITY = 75;

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
  const contentMode = input.contentMode ?? (input.mode === 'novel' ? 'ai-director' : 'local');
  if (contentMode === 'ai-director' && !input.llmEnabled) {
    throw new Error('AI 导演模式需要先连接 LLM。');
  }
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
    maxFloor: input.maxFloor ?? 5,
    targetNodeCount: input.targetNodeCount ?? 11,
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

  const state: RoguelikeState = {
    run: {
      id: input.runId ?? `run-${maze.randomState.cursor.toString(36)}`,
      seed: input.seed,
      mode: input.mode,
      phase: 'exploring',
      turn: 1,
      floor,
      maxFloor: maze.maxFloor,
      currentNodeId: maze.startNodeId,
      result: null,
      contentMode,
      narrativeStyle: input.narrativeStyle ?? (input.mode === 'novel' ? 'novel' : 'tactical'),
      aiFailurePolicy: input.aiFailurePolicy ?? 'ask',
      aiBinding: {
        chatId: input.aiBinding?.chatId ?? null,
        characterId: input.aiBinding?.characterId ?? null,
        personaId: input.aiBinding?.personaId ?? null,
        presetId: input.aiBinding?.presetId ?? null,
        lorebookIds: [...(input.aiBinding?.lorebookIds ?? [])],
      },
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
    economy: { echoes: 0, scoutPoints: 1, shopPurchases: [] },
    modules: [],
    explorationCharges: { breach: 1, watch: 1, perception: 1, resonance: 1 },
    routeEffects: {
      nextNodeGuarded: false,
      shopDiscount: 0,
      bossGlitchSuppressed: false,
      resonanceActive: false,
      freeScoutUsed: false,
    },
    pendingEncounter: null,
    pendingDiaryDrafts: [],
  };
  if (!input.manualStart) return createEncounter(state, maze.nodes[0]);
  return {
    ...state,
    maze: {
      ...maze,
      nodes: maze.nodes.map((node) => node.id === maze.startNodeId
        ? { ...node, state: 'completed' as const }
        : node),
    },
  };
}

export function reduceRunAction(state: RoguelikeState, action: RunAction): RunResolution {
  if (action.type === 'continue-to-mindsea') return continueToMindsea(state, action.llmEnabled);
  if (state.run.phase === 'fragment-overflow' && action.type !== 'resolve-fragment-overflow') {
    return rejected(state, '必须先处理记忆碎片溢出。');
  }
  if (state.run.phase === 'victory' || state.run.phase === 'defeat') {
    return rejected(state, '当前 Run 已结束。');
  }

  if (action.type === 'move-to-node') return moveToNode(state, action.nodeId);
  if (action.type === 'begin-node') {
    const node = state.maze.nodes.find((item) => item.id === state.run.currentNodeId);
    if (!node) return rejected(state, '当前节点不存在。');
    return accepted(createEncounter(state, node), []);
  }
  if (action.type === 'resolve-encounter') return resolveCurrentEncounter(state, action.choiceId);
  if (action.type === 'resolve-encounter-action') return resolveCurrentEncounterAction(state, action.action);
  if (action.type === 'resolve-encounter-actions') return resolveCurrentEncounterActions(state, action.actions);
  if (action.type === 'purchase-offer') {
    return resolveCurrentEncounterAction(state, { type: 'buy', offerId: action.offerId });
  }
  if (action.type === 'sell-fragment') {
    return resolveCurrentEncounterAction(state, { type: 'sell', fragmentId: action.fragmentId });
  }
  if (action.type === 'use-exploration-power') {
    const resolution = useExplorationPower({
      maze: state.maze,
      economy: state.economy,
      modules: state.modules,
      explorationCharges: state.explorationCharges,
      routeEffects: state.routeEffects,
      currentNodeId: state.run.currentNodeId,
    }, action.action);
    if (!resolution.accepted) return rejected(state, resolution.reason ?? '探索能力无法执行。');
    return accepted({
      ...state,
      maze: resolution.state.maze,
      economy: resolution.state.economy,
      modules: resolution.state.modules,
      explorationCharges: resolution.state.explorationCharges,
      routeEffects: resolution.state.routeEffects,
    }, []);
  }
  if (action.type === 'spend-scout-point') {
    const resolution = spendScoutPoint({
      maze: state.maze,
      economy: state.economy,
      modules: state.modules,
      explorationCharges: state.explorationCharges,
      routeEffects: state.routeEffects,
      currentNodeId: state.run.currentNodeId,
    }, action.nodeId);
    if (!resolution.accepted) return rejected(state, resolution.reason ?? '节点侦测无法执行。');
    return accepted({
      ...state,
      maze: resolution.state.maze,
      economy: resolution.state.economy,
      routeEffects: resolution.state.routeEffects,
    }, []);
  }
  if (action.type === 'advance-floor') return advanceFloor(state);
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
      pendingDiaryDrafts: resolution.diaryDraft
        ? [...state.pendingDiaryDrafts, resolution.diaryDraft]
        : state.pendingDiaryDrafts,
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

  const currentNode = state.maze.nodes.find((node) => node.id === state.run.currentNodeId);
  if (
    state.run.floor !== state.run.maxFloor
    || state.run.currentNodeId !== state.maze.coreNodeId
    || currentNode?.type !== 'boss'
  ) return rejected(state, '迷迭香尚未抵达最终记忆核心。');
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

function continueToMindsea(state: RoguelikeState, llmEnabled: boolean): RunResolution {
  if (!llmEnabled) return rejected(state, '需要先接入 LLM，才能进入无垠心海。');
  if (state.run.phase !== 'victory' || state.run.floor < 5 || !state.progression.firstClear) return rejected(state, '必须先完成第五层的心智和解。');
  const floor = state.run.floor + 1;
  const maze = generateMaze({ seed: state.run.seed, mode: 'novel', floor, maxFloor: floor, targetNodeCount: state.maze.nodes.length });
  const next: RoguelikeState = {
    ...state,
    run: {
      ...state.run,
      mode: 'novel',
      contentMode: 'ai-director',
      narrativeStyle: 'novel',
      phase: 'exploring',
      result: null,
      floor,
      maxFloor: floor,
      currentNodeId: maze.startNodeId,
      turn: state.run.turn + 1,
    },
    maze,
    rosmontis: { ...refreshNodeResources(state.rosmontis, state.memoryInventory.fragments), guard: 0, enemyIntegrity: 100, coreStability: 0 },
    explorationCharges: { breach: 1, watch: 1, perception: 1, resonance: 1 },
    routeEffects: { nextNodeGuarded: false, shopDiscount: 0, bossGlitchSuppressed: false, resonanceActive: false, freeScoutUsed: false },
    pendingEncounter: null,
    randomState: maze.randomState,
  };
  return accepted(createEncounter(next, maze.nodes[0]), []);
}

function resolveCurrentEncounter(state: RoguelikeState, choiceId: string): RunResolution {
  return resolveCurrentEncounterAction(state, { type: 'choose', choiceId });
}

function resolveCurrentEncounterActions(
  state: RoguelikeState,
  actions: readonly EncounterAction[],
): RunResolution {
  if (actions.length === 0) return rejected(state, '战术序列不能为空。');
  let working = state;
  const events: RuleEvent[] = [];
  for (const action of actions) {
    const resolution = resolveCurrentEncounterAction(working, action);
    if (!resolution.accepted) return rejected(state, resolution.reason ?? '战术序列无法完整执行。');
    working = resolution.state;
    events.push(...resolution.events);
  }
  return accepted(working, events);
}

function resolveCurrentEncounterAction(
  state: RoguelikeState,
  action: EncounterAction,
): RunResolution {
  const resolution = resolveEncounterAction(state, action);
  if (!resolution.accepted) {
    return rejected(state, resolution.reason ?? '节点遭遇无法结算。');
  }
  const encounter = resolution.state.pendingEncounter;
  if (!encounter?.resolved) return applyDefeat(resolution.state, resolution.events);

  const nodeAlreadyCompleted = resolution.state.maze.nodes.some((node) => (
    node.id === resolution.state.run.currentNodeId && node.state === 'completed'
  ));
  const nodeEvent: RuleEvent[] = nodeAlreadyCompleted
    ? []
    : [{ type: 'node.completed', nodeId: resolution.state.run.currentNodeId }];
  let settled: RoguelikeState = applyNodeFragmentPassives({
    ...resolution.state,
    maze: {
      ...resolution.state.maze,
      nodes: resolution.state.maze.nodes.map((node) => (
        node.id === resolution.state.run.currentNodeId
          ? { ...node, state: 'completed' }
          : node
      )),
    },
  });
  const events = [...resolution.events, ...nodeEvent];
  const defeat = applyDefeat(settled, events);
  if (defeat.state.run.phase === 'defeat') return defeat;
  settled = defeat.state;

  const fragment = createEncounterFragment(settled, encounter);
  if (fragment) {
    const acquired = acquireFragment(
      { phase: settled.run.phase, inventory: settled.memoryInventory },
      fragment,
    );
    if (acquired.accepted) {
      settled = {
        ...settled,
        run: { ...settled.run, phase: acquired.state.phase },
        memoryInventory: acquired.state.inventory,
      };
      events.push(...acquired.events);
    }
  }

  if (encounter.kind !== 'boss' || settled.run.floor !== settled.run.maxFloor) {
    return accepted(settled, events);
  }

  const coreFragment = {
    id: `fragment-core-${settled.run.id}`,
    name: '核心记忆：仍被呼唤的名字',
    kind: 'core' as const,
    tags: ['核心', `第${settled.run.floor}层`],
  };
  const hasCore = settled.memoryInventory.coreFragments.some((fragment) => fragment.id === coreFragment.id);
  if (!hasCore) {
    settled = {
      ...settled,
      memoryInventory: {
        ...settled.memoryInventory,
        coreFragments: [...settled.memoryInventory.coreFragments, coreFragment],
      },
    };
    events.push({ type: 'fragment.acquired', fragmentId: coreFragment.id, kind: 'core' });
  }
  events.push({ type: 'run.ended', result: 'victory' });
  return accepted({
    ...settled,
    run: { ...settled.run, phase: 'victory', result: 'victory' },
    progression: {
      firstClear: true,
      completedRuns: settled.progression.completedRuns + 1,
    },
  }, events);
}

function createEncounterFragment(
  state: RoguelikeState,
  encounter: NonNullable<RoguelikeState['pendingEncounter']>,
): MemoryFragment | null {
  const node = state.maze.nodes.find((item) => item.id === encounter.nodeId);
  if (!node || !['combat', 'encounter', 'unknown'].includes(encounter.kind)) return null;
  const copy = encounter.kind === 'combat'
    ? { name: '破壁后的残响编号', tags: ['战斗', '破壁'] }
    : encounter.kind === 'encounter'
      ? { name: '因果断层中的雨声', tags: ['奇境', '感知'] }
      : { name: '未辨识信号切片', tags: ['未知', '共鸣'] };
  const kind = encounter.kind === 'combat'
    ? (node.type === 'emergency-combat' ? 'pain' : 'skill')
    : encounter.kind === 'encounter'
      ? 'emotion'
      : 'skill';
  return {
    id: `fragment-${state.run.id}-${node.id}`,
    name: `第 ${state.run.floor} 层 · ${copy.name}`,
    kind,
    tags: [...copy.tags, `第${state.run.floor}层`],
  };
}

function advanceFloor(state: RoguelikeState): RunResolution {
  if (state.run.floor >= state.run.maxFloor) {
    return rejected(state, '最终层不能继续推进。');
  }
  if (state.run.currentNodeId !== state.maze.coreNodeId) {
    return rejected(state, '必须先抵达本层出口。');
  }
  if (state.pendingEncounter && !state.pendingEncounter.resolved) {
    return rejected(state, '必须先完成本层出口遭遇。');
  }
  const exit = state.maze.nodes.find((node) => node.id === state.maze.coreNodeId);
  if (!exit || exit.state !== 'completed') return rejected(state, '本层出口尚未完成结算。');

  const floor = state.run.floor + 1;
  const maze = generateMaze({
    seed: state.run.seed,
    mode: state.run.mode,
    floor,
    maxFloor: state.run.maxFloor,
    targetNodeCount: state.maze.nodes.length,
  });
  const next: RoguelikeState = {
    ...state,
    run: {
      ...state.run,
      floor,
      currentNodeId: maze.startNodeId,
      turn: state.run.turn + 1,
    },
    maze,
    rosmontis: {
      ...refreshNodeResources(state.rosmontis, state.memoryInventory.fragments),
      guard: 0,
      enemyIntegrity: 100,
      coreStability: 0,
    },
    explorationCharges: { breach: 1, watch: 1, perception: 1, resonance: 1 },
    routeEffects: {
      nextNodeGuarded: false,
      shopDiscount: 0,
      bossGlitchSuppressed: false,
      resonanceActive: false,
      freeScoutUsed: false,
    },
    pendingEncounter: null,
    randomState: maze.randomState,
  };
  return accepted(createEncounter(next, maze.nodes[0]), []);
}

function moveToNode(state: RoguelikeState, nodeId: string): RunResolution {
  if (state.pendingEncounter && !state.pendingEncounter.resolved) {
    return rejected(state, '必须先完成当前节点遭遇。');
  }
  const current = state.maze.nodes.find((node) => node.id === state.run.currentNodeId);
  if (!current || current.state !== 'completed') return rejected(state, '必须先完成当前节点遭遇。');
  const target = state.maze.nodes.find((node) => node.id === nodeId);
  const connected = state.maze.edges.some((edge) => (
    edge.sourceId === state.run.currentNodeId && edge.targetId === nodeId && !edge.locked
  ));
  if (!target || !connected || target.state !== 'reachable') return rejected(state, '目标节点当前不可到达。');

  const frontier = new Set(state.maze.edges
    .filter((edge) => edge.sourceId === nodeId && !edge.locked)
    .map((edge) => edge.targetId));
  const sourceNodeId = state.run.currentNodeId;
  const moved: RoguelikeState = {
    ...state,
    run: { ...state.run, currentNodeId: nodeId, turn: state.run.turn + 1 },
    rosmontis: refreshNodeResources(state.rosmontis, state.memoryInventory.fragments),
    maze: {
      ...state.maze,
      nodes: state.maze.nodes.map((node) => {
        if (node.id === sourceNodeId) return { ...node, state: 'completed' };
        if (node.id === nodeId) return { ...node, state: 'current' };
        if (frontier.has(node.id) && (node.state === 'hidden' || node.state === 'reachable')) {
          return { ...node, state: 'reachable' };
        }
        if (node.state === 'reachable') return { ...node, state: 'hidden' };
        return node;
      }),
    },
  };
  return accepted(createEncounter(moved, target), [{ type: 'run.moved', sourceNodeId, targetNodeId: nodeId }]);
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
    pendingEncounter: state.pendingEncounter
      ? { ...state.pendingEncounter, resolved: true }
      : state.pendingEncounter,
  };
  if (!fragment) return accepted(settledState, [nodeEvent]);
  const resolution = acquireFragment({ phase: state.run.phase, inventory: state.memoryInventory }, fragment);
  if (!resolution.accepted) return rejected(state, resolution.reason ?? '无法获得记忆碎片。');
  return accepted({
    ...settledState,
    run: { ...state.run, phase: resolution.state.phase },
    rosmontis: fragment.kind === 'core'
      ? {
          ...settledState.rosmontis,
          coreStability: clampVital(settledState.rosmontis.coreStability + CORE_FRAGMENT_STABILITY),
        }
      : settledState.rosmontis,
    memoryInventory: resolution.state.inventory,
  }, [nodeEvent, ...resolution.events]);
}

function applyNodeFragmentPassives(state: RoguelikeState): RoguelikeState {
  const effects = applyFragmentEffects({
    sanity: state.rosmontis.sanity,
    overload: state.rosmontis.overload,
    baseDamage: 0,
    scoutPoints: state.economy.scoutPoints,
    cooldown: 0,
  }, state.memoryInventory.fragments);
  return {
    ...state,
    rosmontis: { ...state.rosmontis, sanity: effects.sanity, overload: effects.overload },
    economy: { ...state.economy, scoutPoints: effects.scoutPoints },
  };
}

function refreshNodeResources(state: GreatswordCombatState, fragments: readonly MemoryFragment[]): GreatswordCombatState {
  const cooldown = (value: number) => applyFragmentEffects({
    sanity: state.sanity,
    overload: state.overload,
    baseDamage: 0,
    scoutPoints: 0,
    cooldown: Math.max(0, value - 1),
  }, fragments).cooldown;
  return {
    ...state,
    actionPoints: MAX_ACTION_POINTS,
    greatswords: {
      breach: { cooldown: cooldown(state.greatswords.breach.cooldown) },
      watch: { cooldown: cooldown(state.greatswords.watch.cooldown) },
      perception: { cooldown: cooldown(state.greatswords.perception.cooldown) },
      resonance: { cooldown: cooldown(state.greatswords.resonance.cooldown) },
    },
  };
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
