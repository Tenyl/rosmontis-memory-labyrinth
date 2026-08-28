import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test/renderApp';

test('filters completed archive records by kind', async () => {
  const user = userEvent.setup();
  renderApp('/archive');

  expect(await screen.findByText('潮湿的儿童病历')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '人物' }));
  expect(screen.getByText('没有倒影的护理员伊莲')).toBeVisible();
  expect(screen.queryByText('潮湿的儿童病历')).not.toBeInTheDocument();
});

test('builds a hypothesis from pinned evidence and exposes conflicts', async () => {
  const user = userEvent.setup();
  renderApp('/archive');

  await user.click(await screen.findByRole('button', { name: /钉选潮湿的儿童病历/ }));
  await user.click(screen.getByRole('tab', { name: '推理台' }));
  expect(screen.getByText('支持证据')).toBeVisible();
  expect(screen.getByText('冲突证据')).toBeVisible();
});

test('opens worldbook management inside the archive route', async () => {
  const user = userEvent.setup();
  renderApp('/archive');
  await user.click(await screen.findByRole('tab', { name: '世界书' }));
  expect(await screen.findByRole('heading', { name: '世界书索引' })).toBeVisible();
  expect(screen.getByText('罗德岛行动协议')).toBeVisible();
  expect(window.location.pathname).toBe('/archive');
});
