import { expect, test } from '@playwright/test';
import { installStructuredLlmMock, type MockLlmRequest } from './helpers/mockLlm';

test('顶部迷迭香对话仅在连接 LLM 后开放并保持独立会话', async ({ page }) => {
  const requests: MockLlmRequest[] = [];
  await installStructuredLlmMock(page, requests);
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/game');

  await page.locator('#nav-chat-open').click();
  await expect(page.getByRole('heading', { name: '迷迭香对话' })).toBeVisible();
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

  await page.getByRole('button', { name: '从当前回复创建分支' }).click();
  await expect(page.locator('#character-chat-session option')).toHaveCount(2);
  await expect(page.getByText('独立于迷宫 Run 的私人通讯。')).toBeVisible();
});
