import type { MazeNode } from '../../game/types';
import { buildMazeLayout, buildMazePath } from './mazeLayout';

const nodes = [
  createNode('entry', 0),
  createNode('combat-a', 1),
  createNode('safehouse-a', 1),
  createNode('shop-a', 1),
  createNode('encounter-a', 2),
  createNode('unknown-a', 2),
  createNode('boss', 3),
] satisfies MazeNode[];

test('places every maze node inside the stage safe area', () => {
  const layout = buildMazeLayout(nodes);

  expect(layout.size).toBe(nodes.length);
  for (const point of layout.values()) {
    expect(point.x).toBeGreaterThanOrEqual(8);
    expect(point.x).toBeLessThanOrEqual(92);
    expect(point.y).toBeGreaterThanOrEqual(12);
    expect(point.y).toBeLessThanOrEqual(88);
  }
});

test('separates nodes that share a depth by at least 18 stage units', () => {
  const layout = buildMazeLayout(nodes);
  const firstBranch = ['combat-a', 'safehouse-a', 'shop-a']
    .map((id) => layout.get(id)?.y ?? 0)
    .sort((left, right) => left - right);

  expect(firstBranch[1] - firstBranch[0]).toBeGreaterThanOrEqual(18);
  expect(firstBranch[2] - firstBranch[1]).toBeGreaterThanOrEqual(18);
});

test('returns the same presentation layout for the same topology', () => {
  expect(buildMazeLayout(nodes)).toEqual(buildMazeLayout(nodes));
});

test('builds a stable cubic bezier path between two nodes', () => {
  expect(buildMazePath({ x: 10, y: 20 }, { x: 60, y: 70 }))
    .toBe('M 10 20 C 35 20, 35 70, 60 70');
});

function createNode(id: string, depth: number): MazeNode {
  return {
    id,
    type: id === 'boss' ? 'boss' : 'combat',
    state: depth === 0 ? 'current' : 'detected',
    floor: 1,
    depth,
    risk: 'C',
    hiddenType: null,
    revealed: true,
    modifiers: [],
  };
}
