import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MazeGraph } from '../../game/types';
import { createSeededRandom } from '../../game/random';
import { RunMazePanel } from './RunMazePanel';

const maze: MazeGraph = {
  seed: 'PANEL-MAZE',
  mode: 'preset',
  floor: 2,
  maxFloor: 2,
  startNodeId: 'node-current',
  coreNodeId: 'node-core',
  randomState: createSeededRandom('PANEL-MAZE'),
  nodes: [
    { id: 'node-current', type: 'combat', state: 'current', floor: 2, depth: 0, risk: 'B', hiddenType: null, revealed: true, modifiers: [] },
    { id: 'node-reachable', type: 'wonder', state: 'reachable', floor: 2, depth: 1, risk: 'A', hiddenType: null, revealed: true, modifiers: [] },
    { id: 'node-shop', type: 'shop', state: 'hidden', floor: 2, depth: 2, risk: 'C', hiddenType: null, revealed: true, modifiers: [] },
    { id: 'node-unknown', type: 'unknown', state: 'hidden', floor: 2, depth: 3, risk: 'A', hiddenType: 'combat', revealed: false, modifiers: [] },
    { id: 'node-hidden', type: 'rest', state: 'hidden', floor: 2, depth: 4, risk: 'C', hiddenType: null, revealed: true, modifiers: [] },
    { id: 'node-core', type: 'boss', state: 'completed', floor: 2, depth: 5, risk: 'S', hiddenType: null, revealed: true, modifiers: ['two-phase-core'] },
  ],
  edges: [
    { id: 'edge-1', sourceId: 'node-current', targetId: 'node-reachable', locked: false },
    { id: 'edge-2', sourceId: 'node-reachable', targetId: 'node-shop', locked: false },
    { id: 'edge-3', sourceId: 'node-shop', targetId: 'node-unknown', locked: false },
    { id: 'edge-4', sourceId: 'node-unknown', targetId: 'node-hidden', locked: false },
    { id: 'edge-5', sourceId: 'node-hidden', targetId: 'node-core', locked: false },
  ],
};

test('renders all node types and exposes current, reachable, and hidden states without color alone', async () => {
  const user = userEvent.setup();
  const onMove = vi.fn();
  const { container } = render(
    <RunMazePanel maze={maze} currentNodeId="node-current" viewMode="graph" onMove={onMove} />,
  );

  expect(screen.getByRole('heading', { name: '迷宫拓扑图' })).toBeVisible();
  for (const label of ['战斗', '奇境', '商店', '未知', '休息处', 'Boss 房']) {
    expect(screen.getAllByText(label)[0]).toBeVisible();
  }
  expect(container.querySelector('.run-maze-edges')).toHaveStyle({ pointerEvents: 'none' });

  expect(screen.getByRole('button', { name: /战斗.*当前节点/ })).toHaveAttribute('aria-current', 'step');
  const reachable = screen.getByRole('button', { name: /奇境.*风险 A.*可抵达/ });
  expect(reachable).toBeEnabled();
  expect(reachable).toHaveAttribute('id', 'run-maze-node-node-reachable');
  expect(screen.getByRole('button', { name: /休息处.*未侦测/ })).toBeDisabled();

  await user.click(reachable);
  expect(screen.getByRole('heading', { name: '奇境' })).toBeVisible();
  expect(onMove).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: '进入节点' }));
  expect(onMove).toHaveBeenCalledOnce();
  expect(onMove).toHaveBeenCalledWith('node-reachable');
});

test('provides an equivalent tactical list with stable node IDs', () => {
  const { container } = render(<RunMazePanel maze={maze} currentNodeId="node-current" viewMode="list" onMove={vi.fn()} />);

  expect(screen.getByRole('heading', { name: '节点战术列表' })).toBeVisible();
  expect(screen.getByRole('button', { name: /奇境.*风险 A.*可抵达/ })).toHaveAttribute(
    'id',
    'run-maze-node-node-reachable',
  );
  expect(container.querySelectorAll('.run-maze-node')).toHaveLength(6);
});

test('attaches novel briefs by node ID without changing graph order or movement', () => {
  const onMove = vi.fn();
  render(
    <RunMazePanel
      maze={maze}
      currentNodeId="node-current"
      viewMode="list"
      onMove={onMove}
      nodeBriefs={[
        { nodeId: 'node-reachable', nodeType: 'wonder', title: '倒流雨幕', description: '车窗外的雨向天空回收倒影。' },
        { nodeId: 'node-current', nodeType: 'combat', title: '无名站台', description: '广播正在擦除站名。' },
      ]}
    />,
  );

  const buttons = screen.getAllByRole('button');
  expect(buttons[0]).toHaveTextContent('无名站台');
  expect(buttons[1]).toHaveTextContent('倒流雨幕');
  expect(buttons[1]).toBeEnabled();
  expect(buttons[4]).toHaveTextContent('休息处');
});
