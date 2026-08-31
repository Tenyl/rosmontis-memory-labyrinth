import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test('酒馆回合在节点场景中生成剧情并写入当前会话', async ({ page }) => {
  await page.goto('/game');
  await expect(page.getByRole('heading', { level: 1, name: '迷迭香的记忆迷宫' })).toBeVisible();

  await page.getByRole('button', { name: '让迷迭香读取记忆回声' }).click();
  await page.getByRole('button', { name: '发送战术指令' }).click();

  await expect(page.getByText(/反复翻转的病室门牌/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '选择：检查门牌背面的刻痕' })).toBeVisible();
  await page.locator('#nav-settings-open').click();
  await page.getByRole('tab', { name: '会话管理' }).click();
  const activeSession = page.locator('.tavern-session-card.is-active');
  await expect(activeSession).toContainText('表层残响');
  await expect(activeSession).toContainText('3');
});
