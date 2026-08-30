import { expect, test } from '@playwright/test';
import { clearPresetRun } from './helpers/run';

test.setTimeout(120_000);

test('three-floor preset run uses local encounters and ends with a protected core memory', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/operation');
  const encountered = new Set<string>();

  await clearPresetRun(page, (kind) => encountered.add(kind));

  const victory = page.getByRole('dialog', { name: '潜入完成：记忆迷宫已逃离' });
  await expect(victory).toBeVisible();
  await expect(victory).toContainText('本地无尽模式已解锁');
  expect(encountered.has('rest')).toBe(true);
  expect(encountered.has('combat')).toBe(true);
  expect(encountered.has('shop')).toBe(true);
  expect(encountered.has('wonder')).toBe(true);
  expect(encountered.has('unknown')).toBe(true);
  expect(encountered.has('boss')).toBe(true);

  await victory.getByRole('button', { name: '重新开始预设迷宫' }).click();
  await page.locator('#nav-archive-open').click();
  await expect(page.getByRole('heading', { level: 1, name: '记忆图鉴' })).toBeVisible();
  await expect(page.getByText('核心记忆：仍被呼唤的名字')).toBeVisible();
});
