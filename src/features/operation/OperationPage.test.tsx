import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGameStore } from '../../store/gameStore';
import { renderApp } from '../../test/renderApp';

test('validates an empty command inline and completes the residual-memory loop', async () => {
  renderApp('/operation');
  await screen.findByRole('heading', { name: '作战主控台' });
  const user = userEvent.setup();

  await user.click(screen.getByRole('button', { name: '发送指令' }));
  expect(screen.getByText('请输入行动描述，或从上方选择一项建议')).toBeVisible();

  await user.click(screen.getByRole('button', { name: '让迷迭香读取残留意识' }));
  await user.click(screen.getByRole('button', { name: '发送指令' }));

  expect(await screen.findByText(/感知检定成功/, {}, { timeout: 2_500 })).toBeVisible();
  expect(screen.getByText(/墙体后的儿童合唱/)).toBeVisible();
  expect(useGameStore.getState().operators.byId.rosmontis.stress).toBe(57);
  expect(useGameStore.getState().archive.records.some((item) => item.id === 'archive-deep-chorus')).toBe(true);
});
