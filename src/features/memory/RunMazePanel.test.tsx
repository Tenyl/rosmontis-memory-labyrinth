import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MazeGraph } from '../../game/types';
import { createSeededRandom } from '../../game/random';
import { RunMazePanel } from './RunMazePanel';

const maze: MazeGraph = {
  seed: 'PANEL-MAZE',
  mode: 'preset',
  floor: 2,
  startNodeId: 'node-current',
  coreNodeId: 'node-core',
  randomState: createSeededRandom('PANEL-MAZE'),
  nodes: [
    { id: 'node-current', type: 'echo-combat', state: 'current', floor: 2, depth: 0 },
    { id: 'node-reachable', type: 'blank-event', state: 'reachable', floor: 2, depth: 1 },
    { id: 'node-hidden', type: 'thought-rest', state: 'hidden', floor: 2, depth: 2 },
    { id: 'node-core', type: 'memory-core', state: 'completed', floor: 2, depth: 3 },
  ],
  edges: [
    { id: 'edge-1', sourceId: 'node-current', targetId: 'node-reachable' },
    { id: 'edge-2', sourceId: 'node-reachable', targetId: 'node-hidden' },
    { id: 'edge-3', sourceId: 'node-hidden', targetId: 'node-core' },
  ],
};

test('renders all node types and exposes current, reachable, and hidden states without color alone', async () => {
  const user = userEvent.setup();
  const onMove = vi.fn();
  const { container } = render(
    <RunMazePanel maze={maze} currentNodeId="node-current" viewMode="graph" onMove={onMove} />,
  );

  expect(screen.getByRole('heading', { name: '迷宫拓扑图' })).toBeVisible();
  expect(screen.getByText('残响实体')).toBeVisible();
  expect(screen.getByText('空白断层')).toBeVisible();
  expect(screen.getByText('思维温室')).toBeVisible();
  expect(screen.getByText('记忆核心')).toBeVisible();
  expect(container.querySelector('.run-maze-edges')).toHaveStyle({ pointerEvents: 'none' });

  expect(screen.getByRole('button', { name: /残响实体.*当前节点/ })).toHaveAttribute('aria-current', 'step');
  const reachable = screen.getByRole('button', { name: /空白断层.*可抵达/ });
  expect(reachable).toBeEnabled();
  expect(reachable).toHaveAttribute('id', 'run-maze-node-node-reachable');
  expect(screen.getByRole('button', { name: /思维温室.*未侦测/ })).toBeDisabled();

  await user.click(reachable);
  expect(onMove).toHaveBeenCalledOnce();
  expect(onMove).toHaveBeenCalledWith('node-reachable');
});

test('provides an equivalent tactical list with stable node IDs', () => {
  render(<RunMazePanel maze={maze} currentNodeId="node-current" viewMode="list" onMove={vi.fn()} />);

  expect(screen.getByRole('heading', { name: '节点战术列表' })).toBeVisible();
  expect(screen.getByRole('button', { name: /空白断层.*可抵达/ })).toHaveAttribute(
    'id',
    'run-maze-node-node-reachable',
  );
  expect(screen.getAllByRole('button')).toHaveLength(4);
});
