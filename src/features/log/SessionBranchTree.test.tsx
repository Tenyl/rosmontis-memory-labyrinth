import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test/renderApp';

test('会话管理可从已绑定会话建立分支并重新载入父会话', async () => {
  const user = userEvent.setup();
  renderApp('/settings');

  await user.click(await screen.findByRole('tab', { name: '会话管理' }));
  const parent = await screen.findByRole('treeitem', { name: '表层残响' });
  await user.click(within(parent).getByRole('button', { name: '从会话 表层残响 建立分支' }));

  const branch = await screen.findByRole('treeitem', { name: /表层残响 \/ 分支/ });
  expect(branch).toHaveTextContent('消息 01 / 回合 01');
  expect(branch.closest('ol')).toHaveAttribute('aria-label', '表层残响的子分支');

  await user.click(within(parent).getByRole('button', { name: '载入会话 表层残响' }));

  await waitFor(() => expect(parent).toHaveAttribute('aria-selected', 'true'));
  expect(within(parent).getByText('当前会话')).toBeVisible();
}, 10_000);
