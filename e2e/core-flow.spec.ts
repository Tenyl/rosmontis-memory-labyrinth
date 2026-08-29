import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test('酒馆回合同步剧情、情报、行动记录与迷迭香投影', async ({ page }) => {
  await page.goto('/operation');
  await expect(page.getByRole('button', { name: /当前会话：雨幕回声/ })).toBeVisible();

  await page.getByRole('button', { name: '让迷迭香读取残留意识' }).click();
  await page.getByRole('button', { name: '发送战术指令' }).click();

  await expect(page.getByText(/门后传来三个频率完全相同的呼吸声/)).toBeVisible();
  await expect(page.getByRole('button', { name: '选择：检查门牌背面的刻痕' })).toBeVisible();
  await expect(page.locator('#operation-rosmontis-stress')).toHaveAttribute('aria-valuenow', '43');

  await page.getByRole('link', { name: /情报档案库/ }).click();
  await expect(page.getByText('反复翻转的 R-09 门牌', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: /行动记录/ }).click();
  await page.getByRole('tab', { name: '战术时间线' }).click();
  await expect(page.getByText('R-09 门后出现三个同步意识回声，迷迭香建立临时安全线。', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: /迷迭香状态/ }).click();
  await expect(page.getByRole('meter', { name: '迷迭香精神负荷' })).toHaveAttribute('aria-valuenow', '43');
});
