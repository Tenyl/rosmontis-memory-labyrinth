import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { clearAllData } from '../../../sillytavern/database';
import { TavernProvider } from '../runtime/TavernProvider';
import type { TavernTransport } from '../runtime/tavern-transport';
import { TavernOrchestrator } from './TavernOrchestrator';

const transport: TavernTransport = {
  mode: 'local',
  async *stream() {
    yield '<maintext>测试回复</maintext><option>继续</option><sum>测试</sum>';
  },
};

beforeEach(async () => clearAllData());
afterEach(async () => clearAllData());

test('does not expose multi-character management in the orchestrator', async () => {
  render(
    <TavernProvider transport={transport}>
      <TavernOrchestrator open onClose={vi.fn()} />
    </TavernProvider>,
  );

  const dialog = await screen.findByRole('dialog', { name: '酒馆编排中枢' });
  await within(dialog).findByText('雨幕回声');
  expect(within(dialog).queryByRole('tab', { name: /^角色/ })).not.toBeInTheDocument();
});

test('creates, renames, loads and confirms deletion of sessions', async () => {
  const user = userEvent.setup();
  render(
    <TavernProvider transport={transport}>
      <TavernOrchestrator open onClose={vi.fn()} />
    </TavernProvider>,
  );

  expect(await screen.findByText('雨幕回声')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '新建会话' }));
  await user.type(screen.getByLabelText('会话名称'), '坍塌区入口');
  await user.click(screen.getByRole('button', { name: '创建并载入' }));
  expect(await screen.findByText('坍塌区入口')).toBeVisible();

  await user.click(screen.getByRole('button', { name: '重命名坍塌区入口' }));
  const renameInput = screen.getByLabelText('新的会话名称');
  await user.clear(renameInput);
  await user.type(renameInput, '坍塌区入口 / 复核');
  await user.click(screen.getByRole('button', { name: '保存名称' }));
  expect(await screen.findByText('坍塌区入口 / 复核')).toBeVisible();

  await user.click(screen.getByRole('button', { name: '删除坍塌区入口 / 复核' }));
  expect(screen.getByRole('dialog', { name: '确认删除会话' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '确认删除' }));
  await waitFor(() => expect(screen.queryByText('坍塌区入口 / 复核')).not.toBeInTheDocument());
  expect(screen.getByText('雨幕回声')).toBeVisible();
});

test('edits typed variables with validation instead of a placeholder-only form', async () => {
  const user = userEvent.setup();
  render(
    <TavernProvider transport={transport}>
      <TavernOrchestrator open onClose={vi.fn()} />
    </TavernProvider>,
  );
  await screen.findByText('雨幕回声');

  await user.click(screen.getByRole('tab', { name: /^变量/ }));
  expect(screen.getByLabelText('变量 rosmontis_stress 的值')).toHaveValue('39');
  await user.click(screen.getByRole('button', { name: '添加变量' }));
  await user.click(screen.getByRole('button', { name: '保存变量' }));
  expect(screen.getByRole('alert')).toHaveTextContent('变量名称不能为空');
});
