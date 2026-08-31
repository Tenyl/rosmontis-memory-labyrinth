import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test/renderApp';

test('changes reduced motion preference and resets the demo after confirmation', async () => {
  const user = userEvent.setup();
  renderApp('/settings');

  await user.click(await screen.findByRole('tab', { name: '视觉与辅助' }));
  await user.click(await screen.findByRole('radio', { name: '减少动效' }));
  expect(document.documentElement).toHaveAttribute('data-motion', 'reduced');
  await user.click(screen.getByRole('button', { name: '恢复演示初始状态' }));
  expect(screen.getByRole('dialog', { name: '确认恢复演示' })).toBeVisible();
});

test('hosts worldbooks characters and sessions inside system settings', async () => {
  const user = userEvent.setup();
  renderApp('/settings');

  await user.click(await screen.findByRole('tab', { name: '内容资料' }));
  expect(await screen.findByRole('heading', { name: '世界书索引' })).toBeVisible();
  expect(screen.getByRole('heading', { name: '角色与身份' })).toBeVisible();

  await user.click(screen.getByRole('tab', { name: '会话管理' }));
  expect(await screen.findByRole('heading', { name: '会话调度' })).toBeVisible();
  expect(screen.getByRole('tree', { name: '酒馆会话分支' })).toBeVisible();
});
