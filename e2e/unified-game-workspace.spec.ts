import { expect, test } from '@playwright/test';
import { settleVisibleEncounter } from './helpers/run';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test('在同一游戏路由进入并结算节点', async ({ page }) => {
  await page.goto('/game');
  await expect(page.getByRole('heading', { level: 1, name: '迷迭香的记忆迷宫' })).toBeVisible();

  await settleVisibleEncounter(page);
  await page.getByRole('button', { name: '返回迷宫' }).click();
  await expect(page.locator('[data-scene-phase="map"]')).toBeVisible();

  const reachable = page.locator('[data-node-state="reachable"]').first();
  await expect(reachable).toBeEnabled();
  await reachable.click();

  await expect(page).toHaveURL(/\/game$/);
  await expect(page.locator('[data-scene-phase="node"]')).toBeVisible();
  await settleVisibleEncounter(page);
  await page.getByRole('button', { name: '返回迷宫' }).click();
  await expect(page.locator('[data-scene-phase="map"]')).toBeVisible();
});

test('旧游玩路由回到游戏且旧工作区不再渲染', async ({ page }) => {
  for (const path of ['/operation', '/memory', '/operators']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/game$/);
    await expect(page.getByRole('heading', { level: 1, name: '迷迭香的记忆迷宫' })).toBeVisible();
  }

  await page.goto('/compendium');
  await expect(page.getByText('叙事档案')).toHaveCount(0);
  await page.goto('/records');
  await expect(page.getByText('战术时间线')).toHaveCount(0);
});
