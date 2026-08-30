import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { MazeNode } from '../../game/types';
import { NodeIntelPanel } from './NodeIntelPanel';

const unknownNode: MazeNode = {
  id: 'node-unknown',
  type: 'unknown',
  state: 'reachable',
  floor: 2,
  depth: 3,
  risk: 'A',
  hiddenType: 'combat',
  revealed: false,
  modifiers: ['unstable-signal'],
};

function renderIntel(node = unknownNode, movementLocked = false) {
  const onMove = vi.fn();
  const onUseExplorationPower = vi.fn();
  const onSpendScoutPoint = vi.fn();
  const view = render(
    <NodeIntelPanel
      node={node}
      currentNodeId="node-current"
      lockedEdges={[]}
      explorationCharges={{ breach: 1, watch: 1, perception: 1, resonance: 1 }}
      scoutPoints={1}
      movementLocked={movementLocked}
      onMove={onMove}
      onUseExplorationPower={onUseExplorationPower}
      onSpendScoutPoint={onSpendScoutPoint}
    />,
  );
  return { ...view, onMove, onUseExplorationPower, onSpendScoutPoint };
}

test('keeps unknown results secret while exposing risk and keyboard actions', async () => {
  const user = userEvent.setup();
  const { onMove, onUseExplorationPower, onSpendScoutPoint } = renderIntel();

  expect(screen.getByRole('heading', { name: '未知信号' })).toBeVisible();
  expect(screen.getByText('风险 A')).toBeVisible();
  expect(screen.queryByText('真实类型：战斗')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: '感知侦测' }));
  expect(onUseExplorationPower).toHaveBeenCalledWith({ swordId: 'perception', nodeId: unknownNode.id });

  await user.click(screen.getByRole('button', { name: '消耗 1 点侦测' }));
  expect(onSpendScoutPoint).toHaveBeenCalledWith(unknownNode.id);

  await user.click(screen.getByRole('button', { name: '进入节点' }));
  expect(onMove).toHaveBeenCalledWith(unknownNode.id);
});

test('reveals the generated type only after a local scan', () => {
  renderIntel({ ...unknownNode, revealed: true });

  expect(screen.getByText('真实类型：战斗')).toBeVisible();
  expect(screen.queryByRole('button', { name: '感知侦测' })).not.toBeInTheDocument();
});

test('blocks movement with an explicit instruction while the current encounter is unresolved', () => {
  const { onMove } = renderIntel(unknownNode, true);

  expect(screen.getByRole('button', { name: '请先完成当前节点遭遇' })).toBeDisabled();
  expect(screen.getByText('请先在作战主控台完成当前节点遭遇。')).toBeVisible();
  expect(onMove).not.toHaveBeenCalled();
});

test('offers breach only for a locked route from the current node', async () => {
  const user = userEvent.setup();
  const current = { ...unknownNode, id: 'node-current', type: 'rest' as const, hiddenType: null, revealed: true, state: 'current' as const };
  const onUseExplorationPower = vi.fn();
  render(
    <NodeIntelPanel
      node={current}
      currentNodeId="node-current"
      lockedEdges={[{ id: 'edge-locked', sourceId: 'node-current', targetId: 'node-hidden', locked: true }]}
      explorationCharges={{ breach: 1, watch: 1, perception: 1, resonance: 1 }}
      scoutPoints={0}
      onMove={vi.fn()}
      onUseExplorationPower={onUseExplorationPower}
      onSpendScoutPoint={vi.fn()}
    />,
  );

  await user.click(screen.getByRole('button', { name: '破壁开路' }));
  expect(onUseExplorationPower).toHaveBeenCalledWith({ swordId: 'breach', edgeId: 'edge-locked' });
});
