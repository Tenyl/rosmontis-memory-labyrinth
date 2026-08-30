import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGameStore } from '../../store/gameStore';
import { renderApp } from '../../test/renderApp';

test('renders the active seeded Run instead of the editable prototype memory map', async () => {
  const { container } = renderApp('/memory');
  const state = useGameStore.getState();

  expect(await screen.findByRole('heading', { name: '迷宫拓扑图' })).toBeVisible();
  expect(container.querySelectorAll('[id^="run-maze-node-"]')).toHaveLength(state.maze.nodes.length);
  expect(screen.getByText(`第 ${state.run.floor} 层`)).toBeVisible();
  expect(screen.getByText(`${state.maze.nodes.length} 个节点`)).toBeVisible();
  expect(document.body).not.toHaveTextContent('向下拓建');
  expect(document.body).not.toHaveTextContent('雨幕中的疗养院');
});

test('moves the active Run by selecting a reachable generated node', async () => {
  const user = userEvent.setup();
  renderApp('/memory');
  useGameStore.getState().resolveEncounterChoice('rest-rehearse');
  const before = useGameStore.getState();
  const reachable = before.maze.nodes.find((node) => node.state === 'reachable')!;

  await user.click(document.querySelector(`#run-maze-node-${reachable.id}`)!);

  expect(useGameStore.getState().run.currentNodeId).toBe(reachable.id);
  expect(document.querySelector(`#run-maze-node-${reachable.id}`)).toHaveAttribute('aria-current', 'step');
});

test('switches to the keyboard-equivalent tactical list', async () => {
  const user = userEvent.setup();
  renderApp('/memory');

  await user.click(await screen.findByRole('button', { name: /战术列表/ }));

  expect(screen.getByRole('heading', { name: '节点战术列表' })).toBeVisible();
  expect(document.querySelector('#memory-view-switch-list')).toHaveAttribute('aria-pressed', 'true');
});
