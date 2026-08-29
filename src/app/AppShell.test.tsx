import { screen } from '@testing-library/react';
import { renderApp } from '../test/renderApp';

test.each([
  ['/operation', '作战主控台'],
  ['/memory', '意识战场'],
  ['/operators', '迷迭香状态'],
  ['/archive', '情报档案库'],
  ['/log', '行动记录'],
  ['/settings', '系统设置'],
])('renders %s with active navigation', async (path, heading) => {
  renderApp(path);

  expect(await screen.findByRole('heading', { name: heading })).toBeVisible();
  expect(screen.getByRole('link', { name: new RegExp(heading) })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('顶部栏以文字公开酒馆连接、模型、角色和预设状态', async () => {
  renderApp('/operation');

  const tavernButton = await screen.findByRole('button', { name: /当前会话：雨幕回声/ });
  expect(tavernButton).toHaveTextContent('本地模拟');
  expect(tavernButton).toHaveTextContent('迷迭香');
  expect(tavernButton).toHaveTextContent('认知战术叙事');
  expect(tavernButton).toHaveTextContent('gpt-3.5-turbo');
});

test('主导航只公开迷迭香的单主角状态入口', async () => {
  renderApp('/operation');

  expect(await screen.findByRole('link', { name: /迷迭香状态/ })).toBeVisible();
  expect(document.body).not.toHaveTextContent(/干员与小队|随行小队|小队链路/);
});
