import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test/renderApp';

test('opens the fully localized shortcut reference from the terminal bar', async () => {
  const user = userEvent.setup();
  renderApp('/operation');

  await user.click(await screen.findByRole('button', { name: '打开快捷键说明' }));
  expect(screen.getByRole('dialog', { name: '终端快捷键' })).toBeVisible();
  expect(screen.getByText('聚焦战术指令')).toBeVisible();
});
