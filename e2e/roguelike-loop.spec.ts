import { expect, test, type Page } from '@playwright/test';

async function settleCurrentNode(page: Page) {
  const settle = page.locator('#btn-complete-current-node');
  await expect(settle).toBeVisible();
  if (await settle.isEnabled()) await settle.click();

  const overflow = page.getByRole('dialog', { name: '记忆槽位溢出：必须遗忘' });
  if (await overflow.isVisible().catch(() => false)) {
    await overflow.getByRole('button', { name: /放弃新碎片/ }).click();
    await expect(overflow).toBeHidden();
  }
}

test('clears the offline preset through normal UI and unlocks local endless', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/operation');
  await expect(page.getByRole('heading', { name: '记忆潜入控制' })).toBeVisible();

  for (let step = 0; step < 12; step += 1) {
    await settleCurrentNode(page);

    const stabilize = page.locator('#btn-stabilize-memory-core');
    if (await stabilize.count()) {
      const resonance = page.locator('#btn-greatsword-resonance');
      await expect(resonance).toBeEnabled();
      await resonance.click();
      await expect(stabilize).toBeEnabled();
      await stabilize.click();
      break;
    }

    await page.locator('#nav-memory-open').click();
    await expect(page.getByRole('heading', { name: '意识战场' })).toBeVisible();
    const reachable = page.locator('button[id^="run-maze-node-"]:not([disabled])');
    await expect(reachable.first()).toBeVisible();
    await reachable.last().click();
    await page.locator('#nav-operation-open').click();
    await expect(page.getByRole('heading', { name: '作战主控台' })).toBeVisible();
  }

  const victory = page.getByRole('dialog', { name: '潜入完成：记忆迷宫已逃离' });
  await expect(victory).toBeVisible();
  await expect(victory.getByText('本地无尽模式已解锁。')).toBeVisible();
  await victory.getByRole('button', { name: '重新开始预设迷宫' }).click();

  const endlessMode = page.locator('#run-mode-endless');
  await expect(endlessMode).toBeEnabled();
  await endlessMode.check();
  await page.locator('#run-seed-input').fill('PLAYWRIGHT-ENDLESS-01');
  await page.getByRole('button', { name: '开始新的记忆潜入' }).click();

  await expect(page.locator('.run-status-mission').getByText('本地无尽')).toBeVisible();
  await expect(page.locator('#run-seed-input')).toHaveValue('PLAYWRIGHT-ENDLESS-01');
});
