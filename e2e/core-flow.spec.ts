import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test('战术指令同步解锁剧情、意识节点、情报与精神负荷警告', async ({ page }) => {
  await page.goto('/operation');
  await expect(page.getByRole('heading', { level: 1, name: '作战主控台' })).toBeVisible();

  await page.getByRole('button', { name: '让迷迭香读取残留意识' }).click();
  await page.getByRole('button', { name: '发送指令' }).click();

  await expect(page.getByText('她听见墙体后的儿童合唱')).toBeVisible();
  await expect(page.locator('.notification-region')).toContainText('精神负荷已升至 57');
  await expect(page.getByRole('button', { name: /检定详情/ })).toContainText('18');

  await page.getByRole('link', { name: /意识战场/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: '意识战场' })).toBeVisible();
  await expect(page.getByText('墙体后的合唱室', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: /情报档案库/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: '情报档案库' })).toBeVisible();
  await expect(page.getByText('墙体后的儿童合唱', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: /干员与小队/ }).click();
  await expect(page.getByRole('meter', { name: '迷迭香精神负荷' })).toHaveAttribute('aria-valuenow', '57');
});

