import { createSeededRandom, randomInt } from './random';
import { getFloorDefinition } from './floors';
import type {
  HiddenMazeNodeType,
  MazeEdge,
  MazeGraph,
  MazeNode,
  MazeNodeType,
  MazeRisk,
  RunMode,
  SeededRandomState,
} from './types';

interface GenerateMazeInput {
  seed: string;
  mode: RunMode;
  floor: number;
  maxFloor: number;
  targetNodeCount: number;
}

const MIN_NODE_COUNT = 9;
const MAX_NODE_COUNT = 13;
const MIDDLE_COLUMN_COUNT = 4;
const HIDDEN_TYPES: readonly HiddenMazeNodeType[] = ['combat', 'safehouse', 'shop', 'encounter'];
const FILLER_TYPES: readonly MazeNodeType[] = [
  'combat',
  'combat',
  'emergency-combat',
  'safehouse',
  'shop',
  'encounter',
  'dilemma',
  'unknown',
];
const RISKS: readonly MazeRisk[] = ['C', 'B', 'B', 'A', 'A', 'S'];

function drawFrom<T>(
  state: SeededRandomState,
  values: readonly T[],
): [T, SeededRandomState] {
  const [index, nextState] = randomInt(state, 0, values.length - 1);
  return [values[index], nextState];
}

function createColumnWidths(
  targetNodeCount: number,
  initialState: SeededRandomState,
): { widths: number[]; randomState: SeededRandomState } {
  const widths = Array.from({ length: MIDDLE_COLUMN_COUNT }, () => 1);
  let remaining = targetNodeCount - 2 - MIDDLE_COLUMN_COUNT;
  let randomState = initialState;

  while (remaining > 0) {
    const available = widths
      .map((width, index) => ({ width, index }))
      .filter(({ width }) => width < 3);
    const [choice, nextState] = randomInt(randomState, 0, available.length - 1);
    randomState = nextState;
    widths[available[choice].index] += 1;
    remaining -= 1;
  }

  return { widths: [1, ...widths, 1], randomState };
}

function getNodeModifiers(type: MazeNodeType, risk: MazeRisk): string[] {
  if (type === 'combat' && (risk === 'A' || risk === 'S')) return ['high-threat'];
  if (type === 'emergency-combat') return ['high-threat', 'overload-surge', 'reinforced-shield'];
  if (type === 'dilemma') return ['memory-transmutation'];
  if (type === 'unknown' && risk === 'S') return ['unstable-signal'];
  if (type === 'boss') return ['two-phase-core'];
  return [];
}

export function generateMaze(input: GenerateMazeInput): MazeGraph {
  if (!Number.isInteger(input.targetNodeCount)) {
    throw new TypeError('迷宫节点数量必须是整数。');
  }
  if (input.targetNodeCount < MIN_NODE_COUNT || input.targetNodeCount > MAX_NODE_COUNT) {
    throw new RangeError(`迷宫节点数量必须在 ${MIN_NODE_COUNT} 至 ${MAX_NODE_COUNT} 之间。`);
  }
  if (!Number.isInteger(input.maxFloor) || input.maxFloor < 1) {
    throw new RangeError('迷宫总层数必须是大于或等于 1 的整数。');
  }
  if (!Number.isInteger(input.floor) || input.floor < 1) {
    throw new RangeError('迷宫层数必须是大于或等于 1 的整数。');
  }
  if (input.floor > input.maxFloor) {
    throw new RangeError('当前层数不能超过迷宫总层数。');
  }

  let randomState = createSeededRandom(
    `${input.seed}|${input.mode}|${input.floor}|${input.maxFloor}`,
  );
  const columnResult = createColumnWidths(input.targetNodeCount, randomState);
  const columnWidths = columnResult.widths;
  randomState = columnResult.randomState;
  const requiredTypes = getFloorDefinition(input.floor).requiredNodeTypes;
  const nodes: MazeNode[] = [];
  const columns: MazeNode[][] = [];
  let middleIndex = 0;

  for (let depth = 0; depth < columnWidths.length; depth += 1) {
    const column: MazeNode[] = [];
    for (let lane = 0; lane < columnWidths[depth]; lane += 1) {
      const [token, nextTokenState] = randomInt(randomState, 0, 0xfffffff);
      randomState = nextTokenState;
      const isStart = depth === 0;
      const isExit = depth === columnWidths.length - 1;
      let type: MazeNodeType;

      if (isStart) {
        type = 'safehouse';
      } else if (isExit) {
        type = 'boss';
      } else if (middleIndex < requiredTypes.length) {
        type = requiredTypes[middleIndex];
        middleIndex += 1;
      } else {
        [type, randomState] = drawFrom(randomState, FILLER_TYPES);
        middleIndex += 1;
      }

      let risk: MazeRisk;
      [risk, randomState] = type === 'boss'
        ? ['S', randomState]
        : drawFrom(randomState, RISKS);
      let hiddenType: HiddenMazeNodeType | null = null;
      if (type === 'unknown') [hiddenType, randomState] = drawFrom(randomState, HIDDEN_TYPES);

      const node: MazeNode = {
        id: `maze-${input.floor}-${String(depth).padStart(2, '0')}-${lane}-${token.toString(36)}`,
        type,
        state: isStart ? 'current' : depth === 1 ? 'reachable' : 'hidden',
        floor: input.floor,
        depth,
        risk,
        hiddenType,
        revealed: type !== 'unknown',
        modifiers: getNodeModifiers(type, risk),
      };
      nodes.push(node);
      column.push(node);
    }
    columns.push(column);
  }

  const edges: MazeEdge[] = [];
  const addEdge = (source: MazeNode, target: MazeNode, locked = false) => {
    const id = `edge-${source.id}-${target.id}`;
    if (!edges.some((edge) => edge.id === id)) {
      edges.push({ id, sourceId: source.id, targetId: target.id, locked });
    }
  };

  for (let depth = 0; depth < columns.length - 1; depth += 1) {
    const sources = columns[depth];
    const targets = columns[depth + 1];

    targets.forEach((target, index) => addEdge(sources[index % sources.length], target));
    sources.forEach((source, index) => addEdge(source, targets[index % targets.length]));

    for (const source of sources) {
      for (const target of targets) {
        if (edges.some((edge) => edge.sourceId === source.id && edge.targetId === target.id)) continue;
        const [include, includeState] = randomInt(randomState, 0, 1);
        randomState = includeState;
        if (include === 0) continue;
        const [lock, lockState] = randomInt(randomState, 0, 2);
        randomState = lockState;
        addEdge(source, target, lock === 0);
      }
    }
  }

  if (!edges.some((edge) => edge.locked)) {
    addEdge(columns[0][0], columns[2][columns[2].length - 1], true);
  }

  return {
    seed: input.seed,
    mode: input.mode,
    floor: input.floor,
    maxFloor: input.maxFloor,
    startNodeId: nodes[0].id,
    coreNodeId: nodes[nodes.length - 1].id,
    nodes,
    edges,
    randomState,
  };
}

export function getReachableNodeIds(graph: MazeGraph, sourceId: string) {
  const visited = new Set<string>();
  const pending = [sourceId];
  while (pending.length) {
    const current = pending.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    for (const edge of graph.edges) {
      if (edge.sourceId === current && !visited.has(edge.targetId)) pending.push(edge.targetId);
    }
  }
  return visited;
}

export function validateMaze(graph: MazeGraph): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const nodeIds = graph.nodes.map((node) => node.id);
  const nodeIdSet = new Set(nodeIds);
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  if (nodeIdSet.size !== nodeIds.length) issues.push('节点 ID 必须唯一。');
  if (!nodeIdSet.has(graph.startNodeId)) issues.push('起点不存在。');
  if (!nodeIdSet.has(graph.coreNodeId)) issues.push('出口坐标不存在。');

  const bosses = graph.nodes.filter((node) => node.type === 'boss');
  if (bosses.length !== 1 || bosses[0]?.id !== graph.coreNodeId) {
    issues.push('每层必须以唯一 Boss 房结束。');
  }

  const types = new Set(graph.nodes.map((node) => node.type));
  if (!types.has('combat')) issues.push('每层必须包含战斗节点。');
  if (!types.has('safehouse')) issues.push('每层必须包含安全屋节点。');
  if (![...types].some((type) => type === 'shop' || type === 'encounter' || type === 'dilemma' || type === 'unknown')) {
    issues.push('每层必须包含非战斗决策节点。');
  }
  if (graph.floor > 1 && !types.has('emergency-combat')) issues.push('第二层起必须包含紧急作战节点。');
  if (graph.floor > 1 && !types.has('dilemma')) issues.push('第二层起必须包含命运抉择节点。');
  if (graph.nodes.some((node) => node.type === 'unknown' && (!node.hiddenType || node.revealed))) {
    issues.push('未知节点必须保存未公开的真实类型。');
  }
  if (graph.nodes.some((node) => node.type !== 'unknown' && node.hiddenType !== null)) {
    issues.push('已知节点不能保存隐藏类型。');
  }

  const currentNodes = graph.nodes.filter((node) => node.state === 'current');
  if (currentNodes.length !== 1 || currentNodes[0]?.id !== graph.startNodeId) {
    issues.push('迷宫必须包含唯一当前起点。');
  }
  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) issues.push(`路径 ID 重复：${edge.id}`);
    edgeIds.add(edge.id);
    const source = nodeById.get(edge.sourceId);
    const target = nodeById.get(edge.targetId);
    if (!source || !target) {
      issues.push(`路径引用未知节点：${edge.id}`);
      continue;
    }
    if (source.id === target.id) issues.push(`路径不能自环：${edge.id}`);
    if (source.depth >= target.depth) issues.push(`路径必须向更深层延伸：${edge.id}`);
  }

  for (const node of graph.nodes) {
    if (node.id === graph.coreNodeId) continue;
    if (!graph.edges.some((edge) => edge.sourceId === node.id && !edge.locked)) {
      issues.push(`节点缺少可用出口：${node.id}`);
    }
  }

  if (!hasUnlockedPath(graph, graph.startNodeId, graph.coreNodeId)) {
    issues.push('入口到 Boss 房缺少无需解锁的合法路线。');
  }
  if (nodeIdSet.has(graph.startNodeId) && getReachableNodeIds(graph, graph.startNodeId).size !== graph.nodes.length) {
    issues.push('存在无法从起点到达的节点。');
  }
  return { valid: issues.length === 0, issues };
}

function hasUnlockedPath(graph: MazeGraph, sourceId: string, targetId: string) {
  const visited = new Set<string>();
  const pending = [sourceId];
  while (pending.length) {
    const current = pending.shift();
    if (!current || visited.has(current)) continue;
    if (current === targetId) return true;
    visited.add(current);
    graph.edges
      .filter((edge) => edge.sourceId === current && !edge.locked)
      .forEach((edge) => pending.push(edge.targetId));
  }
  return false;
}
