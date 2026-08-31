import type { MazeNode } from '../../game/types';

export interface MazePoint {
  x: number;
  y: number;
}

export function buildMazeLayout(nodes: readonly MazeNode[]): Map<string, MazePoint> {
  const layout = new Map<string, MazePoint>();
  if (nodes.length === 0) return layout;

  const maxDepth = Math.max(1, ...nodes.map((node) => node.depth));
  const nodesByDepth = new Map<number, MazeNode[]>();

  for (const node of nodes) {
    nodesByDepth.set(node.depth, [...(nodesByDepth.get(node.depth) ?? []), node]);
  }

  for (const [depth, group] of nodesByDepth) {
    group.forEach((node, index) => {
      const y = group.length === 1 ? 50 : 12 + (index * 76) / (group.length - 1);
      layout.set(node.id, {
        x: 8 + (depth * 84) / maxDepth,
        y,
      });
    });
  }

  return layout;
}

export function buildMazePath(source: MazePoint, target: MazePoint): string {
  const middle = (source.x + target.x) / 2;
  return `M ${source.x} ${source.y} C ${middle} ${source.y}, ${middle} ${target.y}, ${target.x} ${target.y}`;
}
