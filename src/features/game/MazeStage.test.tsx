import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSeededRandom } from '../../game/random';
import type { MazeGraph } from '../../game/types';
import { MazeStage } from './MazeStage';

const maze: MazeGraph = {
  seed: 'STAGE-MAZE',
  mode: 'preset',
  floor: 2,
  maxFloor: 5,
  startNodeId: 'node-current',
  coreNodeId: 'node-core',
  randomState: createSeededRandom('STAGE-MAZE'),
  nodes: [
    { id: 'node-current', type: 'combat', state: 'current', floor: 2, depth: 0, risk: 'B', hiddenType: null, revealed: true, modifiers: [] },
    { id: 'node-reachable', type: 'encounter', state: 'reachable', floor: 2, depth: 1, risk: 'A', hiddenType: null, revealed: true, modifiers: [] },
    { id: 'node-unknown', type: 'unknown', state: 'reachable', floor: 2, depth: 2, risk: 'A', hiddenType: 'combat', revealed: false, modifiers: [] },
    { id: 'node-hidden', type: 'safehouse', state: 'hidden', floor: 2, depth: 3, risk: 'C', hiddenType: null, revealed: true, modifiers: [] },
    { id: 'node-core', type: 'boss', state: 'completed', floor: 2, depth: 4, risk: 'S', hiddenType: null, revealed: true, modifiers: ['two-phase-core'] },
  ],
  edges: [
    { id: 'edge-open', sourceId: 'node-current', targetId: 'node-reachable', locked: false },
    { id: 'edge-locked', sourceId: 'node-current', targetId: 'node-unknown', locked: true },
    { id: 'edge-2', sourceId: 'node-reachable', targetId: 'node-hidden', locked: false },
    { id: 'edge-3', sourceId: 'node-hidden', targetId: 'node-core', locked: false },
  ],
};

const defaultProps = {
  maze,
  currentNodeId: 'node-current',
  viewMode: 'graph' as const,
  camera: { x: 0, y: 0, scale: 1 },
  explorationCharges: { breach: 1, watch: 1, perception: 1, resonance: 1 } as const,
  scoutPoints: 1,
  onCameraChange: vi.fn(),
  onViewModeChange: vi.fn(),
  onRequestEnter: vi.fn(),
  onUseExplorationPower: vi.fn(),
  onSpendScoutPoint: vi.fn(),
};

test('enters a reachable node directly from the graph without a second confirmation button', async () => {
  const user = userEvent.setup();
  const onRequestEnter = vi.fn();
  render(<MazeStage {...defaultProps} onRequestEnter={onRequestEnter} />);

  const reachable = screen.getByRole('button', { name: /奇境.*风险 A.*可抵达/ });
  expect(reachable).toHaveAttribute('id', 'game-maze-node-node-reachable');
  await user.click(reachable);

  expect(onRequestEnter).toHaveBeenCalledOnce();
  expect(onRequestEnter).toHaveBeenCalledWith('node-reachable');
  expect(screen.queryByRole('button', { name: '进入节点' })).not.toBeInTheDocument();
});

test('keeps hidden and completed nodes unavailable and exposes state without relying on color', () => {
  const { container } = render(<MazeStage {...defaultProps} />);

  expect(screen.getByRole('button', { name: /常规作战.*当前节点/ })).toHaveAttribute('aria-current', 'step');
  expect(screen.getByRole('button', { name: /安全屋.*未侦测/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /领袖之敌.*已完成/ })).toBeDisabled();
  expect(container.querySelectorAll('.maze-route-path')).toHaveLength(4);
  expect(container.querySelector('.maze-route-path.is-locked')).toBeInTheDocument();
});

test('switches to an equivalent keyboard list and preserves direct node entry', async () => {
  const user = userEvent.setup();
  const onViewModeChange = vi.fn();
  const onRequestEnter = vi.fn();
  const { rerender } = render(
    <MazeStage {...defaultProps} onViewModeChange={onViewModeChange} onRequestEnter={onRequestEnter} />,
  );

  await user.click(screen.getByRole('button', { name: '节点列表' }));
  expect(onViewModeChange).toHaveBeenCalledWith('list');

  rerender(
    <MazeStage
      {...defaultProps}
      viewMode="list"
      onViewModeChange={onViewModeChange}
      onRequestEnter={onRequestEnter}
    />,
  );
  expect(screen.getByRole('heading', { name: '节点战术列表' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: /奇境.*风险 A.*可抵达/ }));
  expect(onRequestEnter).toHaveBeenCalledWith('node-reachable');
});

test('offers bounded zoom, fit, current-node focus, and contextual exploration controls', async () => {
  const user = userEvent.setup();
  const onCameraChange = vi.fn();
  const onUseExplorationPower = vi.fn();
  const { rerender } = render(
    <MazeStage
      {...defaultProps}
      camera={{ x: 0, y: 0, scale: 1.75 }}
      onCameraChange={onCameraChange}
      onUseExplorationPower={onUseExplorationPower}
    />,
  );

  await user.click(screen.getByRole('button', { name: '放大地图' }));
  expect(onCameraChange).toHaveBeenLastCalledWith({ x: 0, y: 0, scale: 1.8 });
  await user.click(screen.getByRole('button', { name: '适配全部节点' }));
  expect(onCameraChange).toHaveBeenLastCalledWith({ x: 0, y: 0, scale: 1 });
  await user.click(screen.getByRole('button', { name: '定位当前节点' }));
  expect(onCameraChange).toHaveBeenLastCalledWith(expect.objectContaining({ scale: 1.35 }));

  rerender(
    <MazeStage
      {...defaultProps}
      onCameraChange={onCameraChange}
      onUseExplorationPower={onUseExplorationPower}
    />,
  );
  await user.click(screen.getByRole('button', { name: /常规作战.*当前节点/ }));
  await user.click(screen.getByRole('button', { name: '破壁开路' }));
  expect(onUseExplorationPower).toHaveBeenCalledWith({ swordId: 'breach', edgeId: 'edge-locked' });
});
