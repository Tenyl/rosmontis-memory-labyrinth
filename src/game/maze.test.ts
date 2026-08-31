import { describe, expect, test } from 'vitest';

import { generateMaze, getReachableNodeIds, validateMaze } from './maze';

const REQUIRED_NODE_TYPES = [
  'combat',
  'emergency-combat',
  'safehouse',
  'shop',
  'encounter',
  'dilemma',
  'unknown',
  'boss',
] as const;

describe('memory maze generation', () => {
  test('a five-floor run contains every required node type and one boss per floor', () => {
    const floors = [1, 2, 3, 4, 5].map((floor) =>
      generateMaze({
        seed: 'EIGHT-TYPES',
        mode: 'preset',
        floor,
        maxFloor: 5,
        targetNodeCount: 11,
      }),
    );
    const nodes = floors.flatMap((graph) => graph.nodes);

    expect(new Set(nodes.map((node) => node.type))).toEqual(
      new Set(REQUIRED_NODE_TYPES),
    );
    expect(nodes.filter((node) => node.type === 'boss')).toHaveLength(5);
    expect(floors.every((graph) => graph.nodes.find((node) => node.id === graph.startNodeId)?.type === 'safehouse')).toBe(true);
    expect(floors.every((graph) => graph.nodes.at(-1)?.type === 'boss')).toBe(true);
  });

  test('100 seeds produce connected, acyclic, valid and replayable floor graphs', () => {
    for (let index = 0; index < 100; index += 1) {
      const input = {
        seed: `maze-seed-${index}`,
        mode: 'preset' as const,
        floor: (index % 5) + 1,
        maxFloor: 5,
        targetNodeCount: 9 + (index % 5),
      };
      const graph = generateMaze(input);
      const replay = generateMaze(input);
      const nodeIds = graph.nodes.map((node) => node.id);
      const nodeIdSet = new Set(nodeIds);

      expect(replay).toEqual(graph);
      expect(nodeIdSet.size).toBe(graph.nodes.length);
      expect(graph.edges.every((edge) => nodeIdSet.has(edge.sourceId) && nodeIdSet.has(edge.targetId))).toBe(true);
      expect(graph.edges.every((edge) => {
        const source = graph.nodes.find((node) => node.id === edge.sourceId);
        const target = graph.nodes.find((node) => node.id === edge.targetId);
        return source && target && source.depth < target.depth;
      })).toBe(true);
      expect(graph.edges.some((edge) => edge.locked)).toBe(true);
      expect(getReachableNodeIds(graph, graph.startNodeId).size).toBe(graph.nodes.length);
      expect(hasUnlockedPath(graph, graph.startNodeId, graph.coreNodeId)).toBe(true);
      expect(graph.nodes.filter((node) => node.id !== graph.coreNodeId).every((node) => (
        graph.edges.some((edge) => edge.sourceId === node.id && !edge.locked)
      ))).toBe(true);
      expect(validateMaze(graph)).toEqual({ valid: true, issues: [] });
    }
  });

  test('unknown results are deterministic but hidden from the public type', () => {
    const input = {
      seed: 'HIDDEN',
      mode: 'preset' as const,
      floor: 2,
      maxFloor: 5,
      targetNodeCount: 10,
    };
    const first = generateMaze(input);
    const second = generateMaze(input);
    const unknownNodes = first.nodes.filter((node) => node.type === 'unknown');

    expect(first).toEqual(second);
    expect(unknownNodes.length).toBeGreaterThan(0);
    expect(unknownNodes.every((node) => node.hiddenType && !node.revealed)).toBe(true);
  });

  test('each floor provides combat, safehouse and a non-combat decision node', () => {
    for (const floor of [1, 2, 3, 4, 5]) {
      const graph = generateMaze({
        seed: 'FLOOR-QUOTAS',
        mode: 'endless',
        floor,
        maxFloor: 5,
        targetNodeCount: 11,
      });
      const types = new Set(graph.nodes.map((node) => node.type));

      expect(types.has('combat')).toBe(true);
      expect(types.has('safehouse')).toBe(true);
      expect([...types].some((type) => ['shop', 'encounter', 'dilemma', 'unknown'].includes(type))).toBe(true);
      if (floor > 1) {
        expect(types.has('emergency-combat')).toBe(true);
        expect(types.has('dilemma')).toBe(true);
      }
    }
  });

  test('rejects malformed generation requests', () => {
    const base = { seed: 'invalid', mode: 'preset' as const, floor: 1, maxFloor: 5 };

    expect(() => generateMaze({ ...base, targetNodeCount: 8 })).toThrow(/9/);
    expect(() => generateMaze({ ...base, targetNodeCount: 11.5 })).toThrow(/整数/);
    expect(() => generateMaze({ ...base, floor: 0, targetNodeCount: 9 })).toThrow(/层数/);
    expect(() => generateMaze({ ...base, maxFloor: 0, targetNodeCount: 9 })).toThrow(/总层数/);
    expect(() => generateMaze({ ...base, floor: 6, targetNodeCount: 11 })).toThrow(/总层数/);
  });
});

function hasUnlockedPath(
  graph: ReturnType<typeof generateMaze>,
  sourceId: string,
  targetId: string,
) {
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
