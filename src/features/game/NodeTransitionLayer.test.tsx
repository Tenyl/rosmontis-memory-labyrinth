import { act, render, screen } from '@testing-library/react';
import type { MazeNode } from '../../game/types';
import { NodeTransitionLayer } from './NodeTransitionLayer';

const node: MazeNode = {
  id: 'node-encounter',
  type: 'encounter',
  state: 'reachable',
  floor: 2,
  depth: 3,
  risk: 'A',
  hiddenType: null,
  revealed: true,
  modifiers: [],
};

afterEach(() => {
  vi.useRealTimers();
});

test('commits once at 220ms and opens the node after the visual transition', () => {
  vi.useFakeTimers();
  const onCommit = vi.fn();
  const onOpened = vi.fn();
  render(
    <NodeTransitionLayer
      phase="entering-node"
      node={node}
      transitionId={7}
      reducedMotion={false}
      onCommit={onCommit}
      onOpened={onOpened}
      onReturnFinished={vi.fn()}
    />,
  );

  expect(screen.getByRole('status')).toHaveTextContent('正在进入奇境');
  expect(screen.getByRole('status')).toHaveAttribute('data-transition-node-type', 'encounter');
  act(() => vi.advanceTimersByTime(219));
  expect(onCommit).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(onCommit).toHaveBeenCalledOnce();
  expect(onCommit).toHaveBeenCalledWith(7);
  expect(onOpened).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(500));
  expect(onOpened).toHaveBeenCalledOnce();
  expect(onOpened).toHaveBeenCalledWith('node-encounter');
  act(() => vi.advanceTimersByTime(1000));
  expect(onCommit).toHaveBeenCalledOnce();
  expect(onOpened).toHaveBeenCalledOnce();
});

test('clears stale timers when a newer transition replaces the target', () => {
  vi.useFakeTimers();
  const onCommit = vi.fn();
  const onOpened = vi.fn();
  const { rerender } = render(
    <NodeTransitionLayer
      phase="entering-node"
      node={node}
      transitionId={1}
      reducedMotion={false}
      onCommit={onCommit}
      onOpened={onOpened}
      onReturnFinished={vi.fn()}
    />,
  );
  act(() => vi.advanceTimersByTime(100));
  rerender(
    <NodeTransitionLayer
      phase="entering-node"
      node={{ ...node, id: 'node-new', type: 'safehouse' }}
      transitionId={2}
      reducedMotion={false}
      onCommit={onCommit}
      onOpened={onOpened}
      onReturnFinished={vi.fn()}
    />,
  );
  act(() => vi.advanceTimersByTime(220));
  expect(onCommit).toHaveBeenCalledTimes(1);
  expect(onCommit).toHaveBeenCalledWith(2);
  act(() => vi.advanceTimersByTime(500));
  expect(onOpened).toHaveBeenCalledWith('node-new');
  expect(onOpened).not.toHaveBeenCalledWith('node-encounter');
});

test('uses the shortened reduced-motion timing and completes reverse return separately', () => {
  vi.useFakeTimers();
  const onCommit = vi.fn();
  const onOpened = vi.fn();
  const onReturnFinished = vi.fn();
  const { rerender } = render(
    <NodeTransitionLayer
      phase="entering-node"
      node={node}
      transitionId={3}
      reducedMotion
      onCommit={onCommit}
      onOpened={onOpened}
      onReturnFinished={onReturnFinished}
    />,
  );

  act(() => vi.advanceTimersByTime(0));
  expect(onCommit).toHaveBeenCalledWith(3);
  act(() => vi.advanceTimersByTime(120));
  expect(onOpened).toHaveBeenCalledWith('node-encounter');

  rerender(
    <NodeTransitionLayer
      phase="returning-map"
      node={node}
      transitionId={3}
      reducedMotion
      onCommit={onCommit}
      onOpened={onOpened}
      onReturnFinished={onReturnFinished}
    />,
  );
  expect(screen.getByRole('status')).toHaveTextContent('正在返回记忆迷宫');
  act(() => vi.advanceTimersByTime(120));
  expect(onReturnFinished).toHaveBeenCalledOnce();
});
