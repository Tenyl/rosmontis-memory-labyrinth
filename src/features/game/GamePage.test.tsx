import { act, fireEvent, screen } from '@testing-library/react';
import { renderApp } from '../../test/renderApp';
import { useGameStore } from '../../store/gameStore';

afterEach(() => {
  vi.useRealTimers();
});

test('shows map character state and node actions on the same route', async () => {
  renderApp('/game');

  expect(await screen.findByRole('heading', { name: '迷迭香的记忆迷宫' })).toBeVisible();
  expect(screen.getByLabelText('迷迭香 Run 状态')).toBeVisible();
  expect(screen.getByRole('complementary', { name: '当前状态' })).toBeVisible();
  expect(screen.getByRole('region', { name: '记忆迷宫' })).toBeVisible();
  expect(screen.getByRole('region', { name: '迷迭香陪伴交互' })).toBeVisible();
  expect(window.location.pathname).toBe('/game');
});

test('uses the shared node template without any AI interaction surface in local mode', async () => {
  renderApp('/game');

  expect(await screen.findByTestId('shared-node-template')).toBeVisible();
  expect(document.querySelectorAll('#game-encounter-panel')).toHaveLength(1);
  expect(document.getElementById('game-director-status')).toBeNull();
  expect(document.getElementById('game-ai-command-slot')).toBeNull();
  expect(document.getElementById('llm-independent-event')).toBeNull();
  expect(document.querySelector('.tavern-game-view')).toBeNull();
});

test('restores an unresolved current encounter without navigating away', async () => {
  renderApp('/game');

  expect(await screen.findByRole('heading', { name: /安全屋|常规作战|奇境/ })).toBeVisible();
  expect(window.location.pathname).toBe('/game');
});

test('commits movement once during a themed transition without changing route', async () => {
  vi.useFakeTimers();
  renderApp('/game');
  const initialNodeId = useGameStore.getState().run.currentNodeId;

  act(() => useGameStore.getState().completeCurrentNode());
  fireEvent.click(screen.getByRole('button', { name: '返回迷宫' }));
  act(() => vi.advanceTimersByTime(420));
  act(() => vi.advanceTimersByTime(16));

  const currentNodeButton = document.getElementById(`game-maze-node-${initialNodeId}`);
  expect(document.activeElement).toBe(currentNodeButton);

  const target = useGameStore.getState().maze.nodes.find((node) => node.state === 'reachable');
  expect(target).toBeDefined();
  const targetButton = document.getElementById(`game-maze-node-${target!.id}`);
  expect(targetButton).toBeVisible();
  fireEvent.click(targetButton!);

  expect(useGameStore.getState().run.currentNodeId).toBe(initialNodeId);
  act(() => vi.advanceTimersByTime(219));
  expect(useGameStore.getState().run.currentNodeId).toBe(initialNodeId);
  act(() => vi.advanceTimersByTime(1));
  expect(useGameStore.getState().run.currentNodeId).toBe(target!.id);
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(16));
  expect(useGameStore.getState().run.currentNodeId).toBe(target!.id);
  expect(document.activeElement).toBe(document.getElementById('game-node-scene-title'));
  expect(window.location.pathname).toBe('/game');
});
