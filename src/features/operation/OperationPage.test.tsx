import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test/renderApp';

test('只显示迷迭香的行动资源与认知链路状态', async () => {
  renderApp('/operation');

  expect(await screen.findByRole('heading', { name: '迷迭香行动资源' })).toBeVisible();
  expect(screen.getByText('RSM-04 / 迷迭香')).toBeVisible();
  expect(document.body).not.toHaveTextContent(/小队|名干员/);
});

test('validates an empty command inline and completes a Tavern runtime turn', async () => {
  renderApp('/operation');
  await screen.findByRole('heading', { name: '作战主控台' });
  const user = userEvent.setup();

  await user.click(await screen.findByRole('button', { name: '发送战术指令' }));
  expect(screen.getByText('请输入行动描述，或从上方选择一项建议')).toBeVisible();

  await user.click(screen.getByRole('button', { name: '让迷迭香读取残留意识' }));
  await user.click(screen.getByRole('button', { name: '发送战术指令' }));

  expect(await screen.findByText(/门后传来三个频率完全相同的呼吸声/, {}, { timeout: 2_500 })).toBeVisible();
  expect(await screen.findByRole('button', { name: '选择：检查门牌背面的刻痕' })).toBeVisible();
  expect((await screen.findAllByText('回合完成')).length).toBeGreaterThanOrEqual(1);

  await user.click(await screen.findByRole('link', { name: /打开来自会话雨幕回声的来源回合/ }));
  const history = await screen.findByRole('dialog', { name: '历史记录' });
  expect(history).toHaveTextContent('门后传来三个频率完全相同的呼吸声');
  await waitFor(() => expect(history.querySelector('.is-source-focus')).toHaveFocus());
});
