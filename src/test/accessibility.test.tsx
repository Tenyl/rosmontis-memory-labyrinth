import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './renderApp';

const routes = [
  ['/game', 'game-page-title', '迷迭香的记忆迷宫'],
  ['/compendium', 'compendium-page-title', '记忆图鉴'],
  ['/diary', 'diary-page-title', '迷迭香手记'],
  ['/records', 'records-page-title', '探索记录'],
  ['/settings', 'settings-page-title', '系统设置'],
] as const;

test.each(routes)('%s 具有清晰的页面地标与控件名称', async (path, titleId, title) => {
  const { container } = renderApp(path);
  const heading = await screen.findByRole('heading', { level: 1, name: title }, { timeout: 8_000 });

  expect(heading).toHaveAttribute('id', titleId);
  expect(container.querySelectorAll('main')).toHaveLength(1);
  expect(container.querySelector('main#main-content')).toBeInTheDocument();
  expect(container.querySelector('.route-page')).toHaveAttribute('aria-labelledby', titleId);

  const controls = [...container.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select')];
  controls.forEach((control) => expect(control).toHaveAccessibleName());
});

test('provides keyboard skip navigation and a perceivable top-menu state', async () => {
  const { container } = renderApp('/game');
  await screen.findByRole('heading', { level: 1, name: '迷迭香的记忆迷宫' }, { timeout: 8_000 });

  expect(screen.getByRole('link', { name: '跳至主内容' })).toHaveAttribute('href', '#main-content');
  expect(screen.getByRole('navigation', { name: '顶部菜单' })).toBeInTheDocument();
  expect(container.querySelector('#nav-game-open')).toHaveAttribute('aria-current', 'page');
});

test('keeps the top menu, Run state, and maze in a logical reading order', async () => {
  renderApp('/game');

  const menu = await screen.findByRole('navigation', { name: '顶部菜单' });
  const hud = screen.getByLabelText('迷迭香 Run 状态');
  const stage = screen.getByRole('region', { name: '记忆迷宫' });
  const toggle = screen.getByRole('button', { name: '展开顶部菜单' });

  expect(menu.compareDocumentPosition(hud) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(hud.compareDocumentPosition(stage) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(toggle).toHaveAttribute('aria-controls', 'global-top-menu');
});

test('moves focus to main content after top-menu route navigation', async () => {
  const user = userEvent.setup();
  renderApp('/game');
  await screen.findByRole('heading', { level: 1, name: '迷迭香的记忆迷宫' });

  await user.click(screen.getByRole('link', { name: '记忆图鉴' }));
  await screen.findByRole('heading', { level: 1, name: '记忆图鉴' });

  await waitFor(() => expect(document.activeElement).toBe(document.getElementById('main-content')));
});

test('global shell and settings both show the non-commercial fan-work disclaimer', async () => {
  const copy = '本项目为基于《明日方舟》世界观的非营利性同人衍生作品，角色及设定版权归上海鹰角网络科技有限公司所有。';
  const { container } = renderApp('/settings');
  await screen.findByRole('heading', { level: 1, name: '系统设置' }, { timeout: 8_000 });

  expect(container.querySelector('#global-fanwork-disclaimer')).toHaveTextContent(copy);
  expect(container.querySelector('#settings-fanwork-disclaimer')).toHaveTextContent(copy);
  expect(screen.getAllByText(copy, { exact: true })).toHaveLength(2);
});

test('content and session managers remain keyboard-named inside settings', async () => {
  const user = userEvent.setup();
  renderApp('/settings');

  await user.click(await screen.findByRole('tab', { name: '内容资料' }));
  for (const control of document.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select')) {
    expect(control).toHaveAccessibleName();
  }

  await user.click(screen.getByRole('tab', { name: '会话管理' }));
  expect(await screen.findByRole('tree', { name: '酒馆会话分支' })).toBeVisible();
  for (const control of document.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select')) {
    expect(control).toHaveAccessibleName();
  }
});
