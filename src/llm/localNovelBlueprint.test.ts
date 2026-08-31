import { describe, expect, test } from 'vitest';
import type { MazeNode } from '../game/types';
import { createLocalNovelBlueprint } from './localNovelBlueprint';

const nodes: Pick<MazeNode, 'id' | 'type'>[] = [
  { id: 'node-a', type: 'combat' },
  { id: 'node-b', type: 'encounter' },
  { id: 'node-c', type: 'safehouse' },
  { id: 'node-d', type: 'shop' },
  { id: 'node-e', type: 'unknown' },
  { id: 'node-f', type: 'boss' },
];

describe('local novel blueprint', () => {
  test('is deterministic and preserves the authoritative node sequence', () => {
    const first = createLocalNovelBlueprint('NOVEL-SEED', 2, nodes);
    const replay = createLocalNovelBlueprint('NOVEL-SEED', 2, nodes);
    expect(first).toEqual(replay);
    expect(first.nodeBriefs.map(({ nodeId, nodeType }) => ({ nodeId, nodeType }))).toEqual(
      nodes.map(({ id: nodeId, type: nodeType }) => ({ nodeId, nodeType })),
    );
  });

  test('does not mutate the authoritative node input', () => {
    const before = structuredClone(nodes);
    createLocalNovelBlueprint('NOVEL-SEED', 2, nodes);
    expect(nodes).toEqual(before);
  });
});
