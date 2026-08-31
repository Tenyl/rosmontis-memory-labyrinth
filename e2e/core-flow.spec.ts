import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test('酒馆回合同步剧情、情报、行动记录与迷迭香投影', async ({ page }) => {
  await page.goto('/operation');
  await expect(page.getByRole('button', { name: /当前会话：雨幕回声/ })).toBeVisible();

  await page.getByRole('button', { name: '让迷迭香读取残留意识' }).click();
  await page.getByRole('button', { name: '发送战术指令' }).click();

  await expect(page.getByText(/透明墙面后长满没有气味的迷迭香/)).toBeVisible();
  await expect(page.getByRole('button', { name: '选择：在温室边缘短暂休息' })).toBeVisible();
  await expect(page.locator('#operation-rosmontis-stress')).toHaveAttribute('aria-valuenow', '0');

  await page.getByRole('link', { name: /记忆图鉴/ }).click();
  await page.getByRole('tab', { name: '叙事档案' }).click();
  await expect(page.getByText('玻璃思维温室', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: /行动记录/ }).click();
  await page.getByRole('tab', { name: '战术时间线' }).click();
  await expect(page.getByText('玻璃思维温室已完成本地事件建模，等待玩家选择处理方式。', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: /迷迭香状态/ }).click();
  await expect(page.getByRole('meter', { name: '迷迭香精神负荷' })).toHaveAttribute('aria-valuenow', '0');
});
