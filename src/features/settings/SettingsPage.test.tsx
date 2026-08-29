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
