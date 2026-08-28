import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test/renderApp';

test('renders Rosmontis RPG statistics and current condition', async () => {
  renderApp('/operators');
  await screen.findByRole('heading', { name: '干员与小队' });

  const profile = screen.getByRole('article', { name: '迷迭香' });
  expect(within(profile).getByText('理智稳定度')).toBeVisible();
  expect(within(profile).getByText('72%')).toBeVisible();
  expect(within(profile).getByText('精神负荷')).toBeVisible();
  expect(within(profile).getByText('41 / 100')).toBeVisible();
  expect(within(profile).getByText('轻度意识重叠')).toBeVisible();
});

test('opens a completed squad dossier', async () => {
  const user = userEvent.setup();
  renderApp('/operators');

  await user.click(await screen.findByRole('button', { name: '查看阿米娅完整档案' }));
  const dialog = screen.getByRole('dialog', { name: '阿米娅战术档案' });
  expect(dialog).toBeVisible();
  expect(within(dialog).getByText('下一行动')).toBeVisible();
});
