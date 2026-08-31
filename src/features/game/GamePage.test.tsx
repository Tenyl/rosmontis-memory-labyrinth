import { screen } from '@testing-library/react';
import { renderApp } from '../../test/renderApp';

test('shows map character state and node actions on the same route', async () => {
  renderApp('/game');

  expect(await screen.findByRole('heading', { name: '迷迭香的记忆迷宫' })).toBeVisible();
  expect(screen.getByLabelText('迷迭香 Run 状态')).toBeVisible();
  expect(screen.getByRole('region', { name: '记忆迷宫' })).toBeVisible();
  expect(screen.getByRole('region', { name: '迷迭香陪伴交互' })).toBeVisible();
  expect(window.location.pathname).toBe('/game');
});

test('restores an unresolved current encounter without navigating away', async () => {
  renderApp('/game');

  expect(await screen.findByRole('heading', { name: /安全屋|常规作战|奇境/ })).toBeVisible();
  expect(window.location.pathname).toBe('/game');
});
