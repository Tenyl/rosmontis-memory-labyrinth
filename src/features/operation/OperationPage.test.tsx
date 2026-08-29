import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test/renderApp';

test('validates an empty command inline and completes a Tavern runtime turn', async () => {
  renderApp('/operation');
  await screen.findByRole('heading', { name: '作战主控台' });
  const user = userEvent.setup();

  await user.click(screen.getByRole('button', { name: '发送战术指令' }));
  expect(screen.getByText('请输入行动描述，或从上方选择一项建议')).toBeVisible();

  await user.click(screen.getByRole('button', { name: '让迷迭香读取残留意识' }));
  await user.click(screen.getByRole('button', { name: '发送战术指令' }));

  expect(await screen.findByText(/门后传来三个频率完全相同的呼吸声/, {}, { timeout: 2_500 })).toBeVisible();
  expect(await screen.findByRole('button', { name: '选择：检查门牌背面的刻痕' })).toBeVisible();
  expect((await screen.findAllByText('回合完成')).length).toBeGreaterThanOrEqual(1);
});
