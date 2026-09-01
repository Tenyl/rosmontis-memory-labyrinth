import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp, renderPlayableApp } from '../test/renderApp';

test('uses a six-item top menu and no global sidebar', async () => {
  renderPlayableApp('/game');

  expect(await screen.findByRole('navigation', { name: '顶部菜单' })).toBeVisible();
  for (const label of ['游戏', '迷迭香对话', '记忆图鉴', '迷迭香手记', '行动记录', '系统设置']) {
    expect(screen.getByRole('link', { name: label })).toBeVisible();
  }
  expect(document.querySelector('.terminal-sidebar')).toBeNull();
  expect(screen.queryByLabelText('终端主导航')).not.toBeInTheDocument();
});

test('collapses secondary links into an accessible mobile top menu', async () => {
  const user = userEvent.setup();
  renderPlayableApp('/game');

  const toggle = await screen.findByRole('button', { name: '展开顶部菜单' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: '系统设置' })).toBeVisible();
});

test('redirects a direct game route to the opening screen when no save is active', async () => {
  renderApp('/game');

  expect(await screen.findByRole('button', { name: '开始游戏' })).toBeVisible();
  expect(window.location.pathname).toBe('/');
});

test('offers a clear opening-screen path from settings when no save exists', async () => {
  const user = userEvent.setup();
  renderApp('/settings');

  const startLink = await screen.findByRole('link', { name: '开始游戏' });
  await user.click(startLink);

  expect(await screen.findByRole('button', { name: '开始游戏' })).toBeVisible();
  expect(window.location.pathname).toBe('/');
});

test('does not present demo Run telemetry as an active save on utility pages', async () => {
  renderApp('/settings');

  expect(await screen.findByLabelText('当前探索状态')).toHaveTextContent('尚未建立存档');
  expect(screen.queryByText(/第 1 层 · 回合 1/)).not.toBeInTheDocument();
});

test('keeps the game destination available when the current Run has an active save', async () => {
  const user = userEvent.setup();
  renderPlayableApp('/settings');

  const gameLink = await screen.findByRole('link', { name: '游戏' });
  await user.click(gameLink);

  expect(await screen.findByRole('region', { name: '记忆迷宫' })).toBeVisible();
  expect(window.location.pathname).toBe('/game');
});

test.each(['/operation', '/memory', '/operators'])('%s redirects to the game route', async (path) => {
  renderPlayableApp(path);

  expect(await screen.findByRole('heading', { name: '迷迭香的记忆迷宫' })).toBeVisible();
  expect(window.location.pathname).toBe('/game');
});

test.each([
  ['/archive', '/compendium', '记忆图鉴'],
  ['/log', '/records', '探索记录'],
] as const)('%s redirects to its focused replacement', async (path, destination, heading) => {
  renderApp(path);

  expect(await screen.findByRole('heading', { name: heading })).toBeVisible();
  expect(window.location.pathname).toBe(destination);
});
