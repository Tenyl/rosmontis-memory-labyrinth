import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './renderApp';

const routes = [
  ['/operation', '作战主控台'],
  ['/memory', '意识战场'],
  ['/operators', '迷迭香状态'],
  ['/archive', '记忆图鉴'],
  ['/log', '行动记录'],
  ['/settings', '系统设置'],
] as const;

test.each(routes)('%s 为每个交互元素提供唯一描述性 ID', async (path, title) => {
  const { container } = renderApp(path);
  await screen.findByRole('heading', { level: 1, name: title });

  const controls = [...container.querySelectorAll<HTMLElement>(
    'button, a[href], input, textarea, select, [role="tab"]',
  )];
  const ids = controls.map((element) => element.id);
  const missing = controls
    .filter((element) => !element.id)
    .map((element) => element.outerHTML.slice(0, 180));

  expect(missing).toEqual([]);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.every((id) => /^[a-z][a-z0-9-]+$/.test(id))).toBe(true);
});

test('设置预设页与酒馆编排同时打开时仍保持全局唯一 ID', async () => {
  const user = userEvent.setup();
  const { container } = renderApp('/settings');
  await user.click(await screen.findByRole('tab', { name: '生成预设' }));
  await user.click(screen.getByRole('button', { name: /打开酒馆编排/ }));
  const orchestrator = await screen.findByRole('dialog', { name: '酒馆编排中枢' });
  await user.click(within(orchestrator).getByRole('tab', { name: /^预设 / }));

  const controls = [...document.body.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select, [role="tab"]')];
  const ids = controls.map((element) => element.id);
  expect(controls.filter((element) => !element.id).map((element) => element.outerHTML.slice(0, 180))).toEqual([]);
  expect(new Set(ids).size).toBe(ids.length);
  expect(container.querySelector('#settings-preset-import-input')).toBeInTheDocument();
  expect(orchestrator.querySelector('#preset-import-input')).toBeInTheDocument();
});
