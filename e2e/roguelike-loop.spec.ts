import { expect, test } from '@playwright/test';
import { clearPresetRun } from './helpers/run';

test.setTimeout(120_000);

test('clears the offline preset through normal UI and unlocks local endless', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/operation');
  await expect(page.getByRole('heading', { name: '记忆潜入控制' })).toBeVisible();

  await clearPresetRun(page);

  const victory = page.getByRole('dialog', { name: '潜入完成：记忆迷宫已逃离' });
  await expect(victory).toBeVisible();
  await expect(victory.getByText('本地无尽模式已解锁。')).toBeVisible();
  await victory.getByRole('button', { name: '重新开始预设迷宫' }).click();

  await page.locator('#nav-archive-open').click();
  await expect(page.getByRole('heading', { name: '记忆图鉴' })).toBeVisible();
  await expect(page.locator('[id^="memory-compendium-entry-"]').first()).toBeVisible();
  await page.locator('#nav-log-open').click();
  await expect(page.getByRole('region', { name: 'Run 历史' })).toContainText('PRESET-RAIN-ECHO');
  await page.locator('#nav-operation-open').click();

  const endlessMode = page.locator('#run-mode-endless');
  await expect(endlessMode).toBeEnabled();
  await endlessMode.check();
  await page.locator('#run-seed-input').fill('PLAYWRIGHT-ENDLESS-01');
  await page.getByRole('button', { name: '开始新的记忆潜入' }).click();

  await expect(page.locator('.run-status-mission').getByText('本地无尽')).toBeVisible();
  await expect(page.locator('#run-seed-input')).toHaveValue('PLAYWRIGHT-ENDLESS-01');
});
