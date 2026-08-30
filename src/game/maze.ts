import { createSeededRandom, randomInt } from './random';
import type { MazeEdge, MazeGraph, MazeNode, MazeNodeType, RunMode } from './types';

interface GenerateMazeInput {
  seed: string;
  mode: RunMode;
  floor: number;
  targetNodeCount: number;
}

const intermediateTypes: MazeNodeType[] = ['echo-combat', 'blank-event', 'thought-rest'];

export function generateMaze(input: GenerateMazeInput): MazeGraph {
  if (!Number.isInteger(input.targetNodeCount)) {
    throw new TypeError('迷宫节点数量必须是整数。');
  }
  if (input.targetNodeCount < 4) {
    throw new RangeError('迷宫至少 4 个节点。');
  }
  if (!Number.isInteger(input.floor) || input.floor < 1) {
    throw new RangeError('迷宫层数必须是大于或等于 1 的整数。');
  }

  let randomState = createSeededRandom(`${input.seed}|${input.mode}|${input.floor}`);
  const nodes: MazeNode[] = [];

  for (let index = 0; index < input.targetNodeCount; index += 1) {
    const [token, nextTokenState] = randomInt(randomState, 0, 0xfffffff);
    randomState = nextTokenState;
    const isStart = index === 0;
    const isCore = index === input.targetNodeCount - 1;
    let type: MazeNodeType;
    if (isStart) {
      type = 'thought-rest';
    } else if (isCore) {
      type = 'memory-core';
    } else {
      const [typeIndex, nextTypeState] = randomInt(randomState, 0, intermediateTypes.length - 1);
      randomState = nextTypeState;
      type = intermediateTypes[typeIndex];
    }

    nodes.push({
      id: `maze-${input.floor}-${String(index).padStart(2, '0')}-${token.toString(36)}`,
      type,
      state: isStart ? 'current' : index === 1 ? 'reachable' : 'hidden',
      floor: input.floor,
      depth: index,
    });
  }

  const edges: MazeEdge[] = [];
  const addEdge = (sourceIndex: number, targetIndex: number) => {
    const sourceId = nodes[sourceIndex].id;
    const targetId = nodes[targetIndex].id;
    const id = `edge-${sourceId}-${targetId}`;
    if (!edges.some((edge) => edge.id === id)) edges.push({ id, sourceId, targetId });
  };

  for (let index = 0; index < nodes.length - 1; index += 1) addEdge(index, index + 1);
  addEdge(0, 2);
  for (let index = 1; index < nodes.length - 2; index += 1) {
    const [addBranch, nextState] = randomInt(randomState, 0, 1);
    randomState = nextState;
    if (addBranch === 1) addEdge(index, index + 2);
  }

  return {
    seed: input.seed,
    mode: input.mode,
    floor: input.floor,
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
  if (nodeIdSet.size !== nodeIds.length) issues.push('节点 ID 必须唯一。');
  if (!nodeIdSet.has(graph.startNodeId)) issues.push('起点不存在。');
  if (!nodeIdSet.has(graph.coreNodeId)) issues.push('记忆核心坐标不存在。');
  const cores = graph.nodes.filter((node) => node.type === 'memory-core');
  if (cores.length !== 1 || cores[0]?.id !== graph.coreNodeId) issues.push('迷宫必须包含唯一记忆核心。');
  const currentNodes = graph.nodes.filter((node) => node.state === 'current');
  if (currentNodes.length !== 1 || currentNodes[0]?.id !== graph.startNodeId) issues.push('迷宫必须包含唯一当前起点。');
  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) issues.push(`路径 ID 重复：${edge.id}`);
    edgeIds.add(edge.id);
    if (!nodeIdSet.has(edge.sourceId) || !nodeIdSet.has(edge.targetId)) issues.push(`路径引用未知节点：${edge.id}`);
    if (edge.sourceId === edge.targetId) issues.push(`路径不能自环：${edge.id}`);
  }
  if (nodeIdSet.has(graph.startNodeId) && getReachableNodeIds(graph, graph.startNodeId).size !== graph.nodes.length) {
    issues.push('存在无法从起点到达的节点。');
  }
  return { valid: issues.length === 0, issues };
}
