import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './renderApp';

const routes = [
  ['/game', '迷迭香的记忆迷宫'],
  ['/compendium', '记忆图鉴'],
  ['/diary', '迷迭香手记'],
  ['/records', '探索记录'],
  ['/settings', '系统设置'],
] as const;

test.each(routes)('%s 为每个交互元素提供唯一描述性 ID', async (path, title) => {
  const { container } = renderApp(path);
  await screen.findByRole('heading', { level: 1, name: title }, { timeout: 8_000 });

  assertUniqueControlIds(container);
});

test('expanded top menu keeps one uniquely identified copy of each route link', async () => {
  const user = userEvent.setup();
  const { container } = renderApp('/game');
  await user.click(await screen.findByRole('button', { name: '展开顶部菜单' }));

  assertUniqueControlIds(container);
  expect(container.querySelectorAll('#nav-settings-open')).toHaveLength(1);
});

function assertUniqueControlIds(container: HTMLElement) {
  const controls = [...container.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, [role="tab"]')];
  const ids = controls.map((element) => element.id);
  const missing = controls.filter((element) => !element.id).map((element) => element.outerHTML.slice(0, 180));

  expect(missing).toEqual([]);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.every((id) => /^[a-z][a-z0-9-]+$/.test(id))).toBe(true);
}
