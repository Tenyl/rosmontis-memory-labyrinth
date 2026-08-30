import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MazeNode, MemoryInventory, RuleEvent, RunState } from '../../game/types';
import { FragmentOverflowDialog } from './FragmentOverflowDialog';
import { getNodeReward, NodeResolutionPanel } from './NodeResolutionPanel';

const run: RunState = {
  id: 'run-reward',
  seed: 'REWARD',
  mode: 'preset',
  phase: 'exploring',
  turn: 1,
  floor: 3,
  currentNodeId: 'node-echo',
  result: null,
};

const echoNode: MazeNode = {
  id: 'node-echo',
  type: 'combat',
  state: 'current',
  floor: 3,
  depth: 0,
  risk: 'B',
  hiddenType: null,
  revealed: true,
  modifiers: [],
};

test('collects one deterministic standard reward for the current node', async () => {
  const user = userEvent.setup();
  const onComplete = vi.fn();
  const { rerender } = render(
    <NodeResolutionPanel run={run} node={echoNode} ruleLog={[]} onComplete={onComplete} />,
  );
  const reward = getNodeReward(run, echoNode);

  expect(reward).toEqual({
    id: 'fragment-run-reward-node-echo',
    name: '第 3 层 · 残响结构样本',
    kind: 'standard',
    tags: ['战斗', '第3层'],
  });
  await user.click(screen.getByRole('button', { name: '完成节点并回收记忆碎片' }));
  expect(onComplete).toHaveBeenCalledWith(reward);

  const completedLog: RuleEvent[] = [{ type: 'node.completed', nodeId: echoNode.id }];
  rerender(<NodeResolutionPanel run={run} node={echoNode} ruleLog={completedLog} onComplete={onComplete} />);
  expect(screen.getByRole('button', { name: '当前节点已完成结算' })).toBeDisabled();
});

test('creates a protected core reward outside ordinary fragment capacity', () => {
  const coreNode: MazeNode = { ...echoNode, id: 'node-core', type: 'boss', depth: 9 };
  const reward = getNodeReward({ ...run, currentNodeId: coreNode.id }, coreNode);

  expect(reward).toMatchObject({
    id: 'fragment-run-reward-node-core',
    kind: 'core',
    tags: ['核心', '第3层'],
  });
});

const overflowInventory: MemoryInventory = {
  capacity: 2,
  fragments: [
    { id: 'fragment-rain', name: '倒流的雨声', kind: 'standard', tags: ['感知'] },
    { id: 'fragment-ward', name: '空白病房', kind: 'standard', tags: ['守望'] },
  ],
  coreFragments: [
    { id: 'fragment-core', name: '核心记忆：名字', kind: 'core', tags: ['核心'] },
  ],
  pendingFragment: { id: 'fragment-bell', name: '凌晨铃声', kind: 'standard', tags: ['共鸣'] },
};

test('blocks dismissal during overflow, protects core fragments, and allows discarding the pending reward', async () => {
  const user = userEvent.setup();
  const onResolve = vi.fn();
  render(<FragmentOverflowDialog inventory={overflowInventory} onResolve={onResolve} />);

  expect(screen.getByRole('dialog', { name: '记忆槽位溢出：必须遗忘' })).toBeVisible();
  expect(screen.queryByRole('button', { name: /关闭记忆槽位溢出/ })).not.toBeInTheDocument();
  expect(screen.getByText('核心记忆：名字')).toBeVisible();
  expect(screen.getByText('核心保护 · 不可遗忘')).toBeVisible();
  expect(document.querySelector('#btn-fragment-replace-fragment-core')).not.toBeInTheDocument();

  await user.keyboard('{Escape}');
  expect(screen.getByRole('dialog', { name: '记忆槽位溢出：必须遗忘' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: '放弃新碎片：凌晨铃声' }));
  expect(onResolve).toHaveBeenCalledWith({ type: 'discard-pending' });
});

test('replaces only an ordinary fragment through an explicit keyboard button', async () => {
  const user = userEvent.setup();
  const onResolve = vi.fn();
  render(<FragmentOverflowDialog inventory={overflowInventory} onResolve={onResolve} />);

  await user.click(screen.getByRole('button', { name: '遗忘“倒流的雨声”并装载“凌晨铃声”' }));

  expect(onResolve).toHaveBeenCalledWith({ type: 'replace', fragmentId: 'fragment-rain' });
});
