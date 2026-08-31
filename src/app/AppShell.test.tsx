import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test/renderApp';

test('uses a five-item top menu and no global sidebar', async () => {
  renderApp('/game');

  expect(await screen.findByRole('navigation', { name: '顶部菜单' })).toBeVisible();
  for (const label of ['游戏', '记忆图鉴', '迷迭香手记', '行动记录', '系统设置']) {
    expect(screen.getByRole('link', { name: label })).toBeVisible();
  }
  expect(document.querySelector('.terminal-sidebar')).toBeNull();
  expect(screen.queryByLabelText('终端主导航')).not.toBeInTheDocument();
});

test('collapses secondary links into an accessible mobile top menu', async () => {
  const user = userEvent.setup();
  renderApp('/game');

  const toggle = await screen.findByRole('button', { name: '展开顶部菜单' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: '系统设置' })).toBeVisible();
});

test.each(['/operation', '/memory', '/operators'])('%s redirects to the game route', async (path) => {
  renderApp(path);

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
