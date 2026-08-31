import { expect, test } from '@playwright/test';
import { installStructuredLlmMock, type MockLlmRequest } from './helpers/mockLlm';

test('顶部迷迭香对话仅在连接 LLM 后开放并保持独立会话', async ({ page }) => {
  const requests: MockLlmRequest[] = [];
  await installStructuredLlmMock(page, requests);
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/game');

  await page.locator('#nav-chat-open').click();
  await expect(page.getByRole('heading', { name: '迷迭香对话' })).toBeVisible();
  const gameStateBeforeChat = await page.evaluate(() => window.localStorage.getItem('rhodes-cognition-terminal-state'));
  await expect(page.getByRole('link', { name: '前往接口设置' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '发送给迷迭香' })).toHaveCount(0);

  await page.getByRole('link', { name: '前往接口设置' }).click();
  await page.locator('#settings-api-base-url').fill('http://127.0.0.1:4617/mock-llm');
  await page.locator('#settings-api-model').fill('playwright-structured-model');
  await page.locator('#settings-api-key').fill('sk-playwright-only');
  await page.locator('#settings-api-save').click();
  await page.locator('#nav-chat-open').click();

  await page.getByRole('textbox', { name: '发送给迷迭香' }).fill('今天想聊些什么？');
  await page.getByRole('button', { name: '发送消息' }).click();
  await expect(page.getByText('博士，我在听。现在没有战斗，我们可以慢慢说。')).toBeVisible();
  expect(requests.some((request) => request.task === 'character-chat')).toBe(true);

  await page.getByRole('button', { name: '重试' }).click();
  await expect.poll(() => requests.filter((request) => request.task === 'character-chat').length).toBe(2);
  await page.getByRole('button', { name: '历史' }).click();
  await page.getByRole('button', { name: '编辑消息：今天想聊些什么？' }).click();
  await page.getByRole('textbox', { name: '编辑后的消息内容' }).fill('雨停以后想去哪里？');
  await page.getByRole('dialog', { name: '编辑历史消息' }).getByRole('button', { name: '保存并重新生成' }).click();
  await expect.poll(() => requests.filter((request) => request.task === 'character-chat').length).toBe(3);
  await page.getByRole('dialog', { name: '历史记录' }).getByRole('button', { name: '关闭' }).click();

  await page.getByRole('button', { name: '从当前回复创建分支' }).click();
  await expect(page.locator('#character-chat-session option')).toHaveCount(2);
  await page.getByRole('button', { name: '重命名当前对话' }).click();
  await page.getByRole('textbox', { name: '对话名称' }).fill('雨后的私人通讯');
  await page.getByRole('dialog', { name: '重命名对话' }).getByRole('button', { name: '保存名称' }).click();
  await expect(page.locator('#character-chat-session')).toHaveValue(/.+/);
  await expect(page.getByRole('option', { name: '雨后的私人通讯' })).toBeAttached();

  await page.setViewportSize({ width: 375, height: 812 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

  await page.getByRole('button', { name: '删除当前对话' }).click();
  await page.getByRole('dialog', { name: '删除对话' }).getByRole('button', { name: '确认删除' }).click();
  await expect(page.locator('#character-chat-session option')).toHaveCount(1);
  await expect(page.getByText('独立于迷宫 Run 的私人通讯。')).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('rhodes-cognition-terminal-state'))).toBe(gameStateBeforeChat);
});
