import { describe, expect, test } from 'vitest';

import { generateMaze, getReachableNodeIds, validateMaze } from './maze';

const REQUIRED_NODE_TYPES = ['combat', 'rest', 'shop', 'wonder', 'unknown', 'boss'] as const;

describe('memory maze generation', () => {
  test('a three-floor run contains every required node type and one final boss', () => {
    const floors = [1, 2, 3].map((floor) =>
      generateMaze({
        seed: 'SIX-TYPES',
        mode: 'preset',
        floor,
        maxFloor: 3,
        targetNodeCount: 10,
      }),
    );
    const nodes = floors.flatMap((graph) => graph.nodes);

    expect(new Set(nodes.map((node) => node.type))).toEqual(
      new Set(REQUIRED_NODE_TYPES),
    );
    expect(nodes.filter((node) => node.type === 'boss')).toHaveLength(1);
    expect(floors[0].nodes.find((node) => node.id === floors[0].startNodeId)?.type).toBe('rest');
    expect(floors[2].nodes.at(-1)?.type).toBe('boss');
  });

  test('100 seeds produce connected, acyclic, valid and replayable floor graphs', () => {
    for (let index = 0; index < 100; index += 1) {
      const input = {
        seed: `maze-seed-${index}`,
        mode: 'preset' as const,
        floor: (index % 3) + 1,
        maxFloor: 3,
        targetNodeCount: 8 + (index % 4),
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
      expect(validateMaze(graph)).toEqual({ valid: true, issues: [] });
    }
  });

  test('unknown results are deterministic but hidden from the public type', () => {
    const input = {
      seed: 'HIDDEN',
      mode: 'preset' as const,
      floor: 2,
      maxFloor: 3,
      targetNodeCount: 10,
    };
    const first = generateMaze(input);
    const second = generateMaze(input);
    const unknownNodes = first.nodes.filter((node) => node.type === 'unknown');

    expect(first).toEqual(second);
    expect(unknownNodes.length).toBeGreaterThan(0);
    expect(unknownNodes.every((node) => node.hiddenType && !node.revealed)).toBe(true);
  });

  test('each floor provides combat, rest and a non-combat decision node', () => {
    for (const floor of [1, 2, 3]) {
      const graph = generateMaze({
        seed: 'FLOOR-QUOTAS',
        mode: 'endless',
        floor,
        maxFloor: 3,
        targetNodeCount: 8,
      });
      const types = new Set(graph.nodes.map((node) => node.type));

      expect(types.has('combat')).toBe(true);
      expect(types.has('rest')).toBe(true);
      expect([...types].some((type) => ['shop', 'wonder', 'unknown'].includes(type))).toBe(true);
    }
  });

  test('rejects malformed generation requests', () => {
    const base = { seed: 'invalid', mode: 'preset' as const, floor: 1, maxFloor: 3 };

    expect(() => generateMaze({ ...base, targetNodeCount: 7 })).toThrow(/8/);
    expect(() => generateMaze({ ...base, targetNodeCount: 11.5 })).toThrow(/整数/);
    expect(() => generateMaze({ ...base, floor: 0, targetNodeCount: 8 })).toThrow(/层数/);
    expect(() => generateMaze({ ...base, maxFloor: 0, targetNodeCount: 8 })).toThrow(/总层数/);
    expect(() => generateMaze({ ...base, floor: 4, targetNodeCount: 8 })).toThrow(/总层数/);
  });
});
