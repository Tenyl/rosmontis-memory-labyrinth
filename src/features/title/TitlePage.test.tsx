import { fireEvent, screen } from '@testing-library/react';
import { renderApp } from '../../test/renderApp';
import { useGameStore } from '../../store/gameStore';

test('opens on the title screen with continue disabled when no save exists', async () => {
  renderApp('/');

  expect(await screen.findByRole('heading', { name: '迷迭香的记忆迷宫' })).toBeVisible();
  expect(screen.getByRole('button', { name: '继续游戏' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '开始游戏' })).toBeEnabled();
});

test('starts a new run in a chosen slot and waits for the player to select the first node', async () => {
  renderApp('/');
  fireEvent.click(await screen.findByRole('button', { name: '开始游戏' }));
  fireEvent.click(screen.getByRole('button', { name: /存档槽 1/ }));

  expect(await screen.findByRole('region', { name: '记忆迷宫' })).toBeVisible();
  expect(window.location.pathname).toBe('/game');
  expect(useGameStore.getState().pendingEncounter).toBeNull();
  expect(useGameStore.getState().maze.nodes.filter((node) => node.state === 'reachable').length).toBeGreaterThanOrEqual(2);
});

test('offers the shared local template and locks AI direction while no LLM is connected', async () => {
  renderApp('/');
  fireEvent.click(await screen.findByRole('button', { name: '开始游戏' }));

  expect(screen.getByRole('radio', { name: /^本地规则模式/ })).toBeEnabled();
  expect(screen.getByRole('radio', { name: /^AI 导演模式/ })).toBeDisabled();
});

test('unlocks local endless mode on the opening screen after the first clear', async () => {
  renderApp('/');
  useGameStore.setState({ progression: { firstClear: true, completedRuns: 1 } });
  fireEvent.click(await screen.findByRole('button', { name: '开始游戏' }));

  expect(document.querySelector('#title-mode-endless')).toBeEnabled();
});
