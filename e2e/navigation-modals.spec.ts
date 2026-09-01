import { expect, test, type Page } from '@playwright/test';
import { settleVisibleEncounter, startLocalRun } from './helpers/run';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

async function closesWithEscapeAndRestoresFocus(page: Page, triggerId: string, dialogName: string) {
  const trigger = page.locator(`#${triggerId}`);
  await trigger.click();
  await expect(page.getByRole('dialog', { name: dialogName })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: dialogName })).toBeHidden();
  await expect(trigger).toBeFocused();
}

test('快捷键说明弹层支持 Escape 并恢复焦点', async ({ page }) => {
  await startLocalRun(page, false);
  await closesWithEscapeAndRestoresFocus(page, 'global-shortcuts-open', '终端快捷键');
});

test('迷宫只允许沿生成拓扑进入可抵达节点', async ({ page }) => {
  await startLocalRun(page);
  await settleVisibleEncounter(page);
  await page.locator('#game-return-to-maze').click();
  await expect(page.locator('[data-scene-phase="map"]')).toBeVisible();

  const currentNode = page.locator('[id^="game-maze-node-"][aria-current="step"]');
  const reachableNode = page.locator('[id^="game-maze-node-"][data-node-state="reachable"]').first();
  const hiddenNode = page.locator('[id^="game-maze-node-"][data-node-state="hidden"]').first();
  await expect(currentNode).toHaveCount(1);
  await expect(reachableNode).toBeEnabled();
  await expect(hiddenNode).toBeDisabled();

  const previousNodeId = await currentNode.getAttribute('id');
  const targetNodeId = await reachableNode.getAttribute('id');
  await reachableNode.click();
  await expect(page.locator('[data-scene-phase="node"]')).toBeVisible();
  await settleVisibleEncounter(page);
  await page.locator('#game-return-to-maze').click();

  await expect(page.locator(`#${targetNodeId}`)).toHaveAttribute('aria-current', 'step');
  await expect(page.locator(`#${previousNodeId}`)).not.toHaveAttribute('aria-current', 'step');
});

test('统一游戏页使用可替换空白立绘且没有随行档案入口', async ({ page }) => {
  await startLocalRun(page);
  const portraits = page.getByRole('img', { name: '迷迭香人物立绘占位图' });
  await expect(portraits.first()).toHaveJSProperty('complete', true);
  expect(await portraits.first().evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('[id^="operator-dossier-open-"]')).toHaveCount(0);
});

test('从开屏进入设置后不能绕过存档直接开始游戏', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '系统设置' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('link', { name: '开始游戏' })).toBeVisible();
  await expect(page.getByLabel('当前探索状态')).toContainText('尚未建立存档');

  await page.getByRole('link', { name: '开始游戏' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: '开始游戏' })).toBeVisible();

  await page.goto('/game');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: '开始游戏' })).toBeVisible();
});

test('设置恢复确认弹层支持键盘关闭', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('tab', { name: '视觉与辅助' }).click();
  await closesWithEscapeAndRestoresFocus(page, 'settings-reset-open', '确认恢复演示');
});
