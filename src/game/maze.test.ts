import { describe, expect, test } from 'vitest';
import { generateMaze, getReachableNodeIds, validateMaze } from './maze';

describe('memory maze generation', () => {
  test('100 seeds produce unique, connected, valid and replayable graphs', () => {
    for (let index = 0; index < 100; index += 1) {
      const input = { seed: `maze-seed-${index}`, mode: 'preset' as const, floor: 1, targetNodeCount: 12 };
      const graph = generateMaze(input);
      const replay = generateMaze(input);
      const nodeIds = graph.nodes.map((node) => node.id);
      const nodeIdSet = new Set(nodeIds);

      expect(replay).toEqual(graph);
      expect(nodeIdSet.size).toBe(graph.nodes.length);
      expect(graph.nodes.filter((node) => node.id === graph.startNodeId)).toHaveLength(1);
      expect(graph.nodes.filter((node) => node.type === 'memory-core')).toHaveLength(1);
      expect(graph.coreNodeId).toBe(graph.nodes.find((node) => node.type === 'memory-core')?.id);
      expect(graph.edges.every((edge) => nodeIdSet.has(edge.sourceId) && nodeIdSet.has(edge.targetId))).toBe(true);
      expect(getReachableNodeIds(graph, graph.startNodeId).size).toBe(graph.nodes.length);
      expect(validateMaze(graph)).toEqual({ valid: true, issues: [] });
    }
  });

  test('creates a non-linear graph using only approved node types and states', () => {
    const graph = generateMaze({ seed: 'branching', mode: 'endless', floor: 7, targetNodeCount: 10 });

    expect(graph.edges.length).toBeGreaterThanOrEqual(graph.nodes.length);
    expect(graph.nodes.every((node) => [
      'echo-combat',
      'blank-event',
      'thought-rest',
      'memory-core',
    ].includes(node.type))).toBe(true);
    expect(graph.nodes.filter((node) => node.state === 'current')).toHaveLength(1);
    expect(graph.nodes.find((node) => node.id === graph.startNodeId)?.state).toBe('current');
  });

  test('changes the graph when seed, mode, or floor changes', () => {
    const baseline = generateMaze({ seed: 'stable', mode: 'preset', floor: 1, targetNodeCount: 8 });

    expect(generateMaze({ seed: 'changed', mode: 'preset', floor: 1, targetNodeCount: 8 })).not.toEqual(baseline);
    expect(generateMaze({ seed: 'stable', mode: 'endless', floor: 1, targetNodeCount: 8 })).not.toEqual(baseline);
    expect(generateMaze({ seed: 'stable', mode: 'preset', floor: 2, targetNodeCount: 8 })).not.toEqual(baseline);
  });

  test('rejects malformed generation requests', () => {
    expect(() => generateMaze({ seed: 'small', mode: 'preset', floor: 1, targetNodeCount: 3 })).toThrow(/至少 4/);
    expect(() => generateMaze({ seed: 'fraction', mode: 'preset', floor: 1, targetNodeCount: 7.5 })).toThrow(/整数/);
    expect(() => generateMaze({ seed: 'floor', mode: 'preset', floor: 0, targetNodeCount: 8 })).toThrow(/层数/);
  });
});
