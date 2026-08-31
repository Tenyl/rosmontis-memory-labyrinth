import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test/renderApp';

test('会话分支按父子层级显示精确分歧回合，载入父会话后同步顶部栏', async () => {
  const user = userEvent.setup();
  renderApp('/operation');

  await screen.findByRole('heading', { name: '迷迭香的记忆迷宫' }, { timeout: 5_000 });
  await user.click(await screen.findByRole('button', { name: /打开历史记录/ }, { timeout: 5_000 }));
  const history = await screen.findByRole('dialog', { name: '历史记录' });
  await user.click(within(history).getByRole('button', { name: '从第 1 条消息创建分支' }));

  await user.click(screen.getByRole('link', { name: /系统设置/ }));
  await user.click(await screen.findByRole('tab', { name: '会话管理' }));
  const branch = await screen.findByRole('treeitem', { name: /表层残响 \/ 分支/ });
  expect(branch).toHaveTextContent('消息 01 / 回合 01');
  expect(branch.closest('ol')).toHaveAttribute('aria-label', '表层残响的子分支');

  const parent = screen.getByRole('treeitem', { name: '表层残响' });
  await user.click(within(parent).getByRole('button', { name: '载入会话 表层残响' }));

  await waitFor(() => expect(parent).toHaveAttribute('aria-selected', 'true'));
  expect(within(parent).getByText('当前会话')).toBeVisible();
}, 10_000);
