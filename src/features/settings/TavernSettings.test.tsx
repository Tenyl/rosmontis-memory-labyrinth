import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { clearAllData } from '../../sillytavern/database';
import { exportTavernBackup } from '../../sillytavern/backup';
import { renderApp } from '../../test/renderApp';

beforeEach(async () => clearAllData());
afterEach(async () => {
  vi.unstubAllGlobals();
  await clearAllData();
});

test('校验主接口字段、可切换密钥可见性，且次接口默认关闭', async () => {
  const user = userEvent.setup();
  renderApp('/settings');
  await user.click(await screen.findByRole('tab', { name: '接口连接' }));

  const baseUrl = screen.getByLabelText('API 基础 URL');
  const model = screen.getByLabelText('模型名称');
  const key = screen.getByLabelText(/^API 密钥/);
  await user.clear(baseUrl);
  await user.tab();
  expect(screen.getByText('请输入 API 基础 URL')).toBeVisible();
  await user.clear(model);
  await user.tab();
  expect(screen.getByText('请输入模型名称')).toBeVisible();

  expect(key).toHaveAttribute('type', 'password');
  await user.click(screen.getByRole('button', { name: '显示 API 密钥' }));
  expect(key).toHaveAttribute('type', 'text');
  expect(screen.getByRole('checkbox', { name: '启用次级接口' })).not.toBeChecked();
  expect(screen.getByLabelText('次级接口 URL')).toBeDisabled();
});

test('连接测试使用内部通知，失败信息不回显 API 密钥', async () => {
  const user = userEvent.setup();
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(new Response('{}', { status: 200 }))
    .mockResolvedValueOnce(new Response('server echoed sk-sensitive-value', { status: 401 })));
  renderApp('/settings');
  await screen.findByRole('tab', { name: '接口连接' });
  const key = await screen.findByLabelText(/^API 密钥/);
  await user.type(key, 'sk-sensitive-value');
  await user.click(screen.getByRole('button', { name: '测试主接口连接' }));
  expect(await screen.findByText('接口连接成功')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '测试主接口连接' }));
  expect(await screen.findByText('接口连接失败')).toBeVisible();
  expect(document.body).not.toHaveTextContent('sk-sensitive-value');
  expect(document.body).toHaveTextContent('HTTP 401');
});

test('解析协议默认恢复六标签，并要求 maintext 与 option', async () => {
  const user = userEvent.setup();
  renderApp('/settings');
  await user.click(await screen.findByRole('tab', { name: '解析协议' }));
  expect(await screen.findAllByLabelText(/解析标签 \d/)).toHaveLength(6);
  const first = screen.getByLabelText('解析标签 1');
  await user.clear(first);
  await user.type(first, 'story');
  await user.click(screen.getByRole('button', { name: '保存解析协议' }));
  expect(screen.getByText('解析标签必须包含 maintext 与 option')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '恢复默认六标签' }));
  expect(screen.getAllByLabelText(/解析标签 \d/).map((input) => (input as HTMLInputElement).value)).toEqual([
    'maintext', 'option', 'sum', 'vars', 'thinking', 'think',
  ]);
});

test('完整备份可在导入前预览数量，清理会话使用内部确认框', async () => {
  const user = userEvent.setup();
  renderApp('/settings');
  await user.click(await screen.findByRole('tab', { name: '本地数据' }));
  const backup = await exportTavernBackup();
  const file = new File([JSON.stringify(backup)], 'rhodes-backup.json', { type: 'application/json' });
  await user.upload(screen.getByLabelText('导入酒馆完整备份'), file);
  const preview = await screen.findByRole('dialog', { name: '备份导入预览' });
  expect(within(preview).getByText(`会话 ${backup.chats.length}`)).toBeVisible();
  expect(within(preview).getByText(`角色 ${backup.characters.length}`)).toBeVisible();

  await user.click(within(preview).getByRole('button', { name: '取消导入' }));
  await user.click(screen.getByRole('button', { name: '清理全部会话' }));
  expect(screen.getByRole('dialog', { name: '确认清理会话' })).toBeVisible();
  expect(screen.queryByRole('dialog', { name: '确认恢复酒馆默认内容' })).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: '确认清理' })).toBeEnabled());
});
