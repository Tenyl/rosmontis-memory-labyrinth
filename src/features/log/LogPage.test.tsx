import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test/renderApp';

test('filters the action timeline and opens source replay', async () => {
  const user = userEvent.setup();
  renderApp('/log');

  await user.click(await screen.findByRole('button', { name: '仅显示检定' }));
  await user.click(screen.getByRole('button', { name: /打开感知检定详情/ }));
  expect(screen.getByRole('dialog', { name: '剧情回溯' })).toBeVisible();
});
