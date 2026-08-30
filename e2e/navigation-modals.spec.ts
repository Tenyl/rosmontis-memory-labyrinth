import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
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
  await page.goto('/operation');
  await closesWithEscapeAndRestoresFocus(page, 'global-shortcuts-open', '终端快捷键');
});

test('意识战场仅允许沿生成拓扑进入可抵达节点', async ({ page }) => {
  await page.goto('/memory');
  const currentNode = page.locator('[id^="run-maze-node-"][aria-current="step"]');
  const reachableNode = page.locator('[id^="run-maze-node-"][data-node-state="reachable"]').first();
  const hiddenNode = page.locator('[id^="run-maze-node-"][data-node-state="hidden"]').first();

  await expect(currentNode).toHaveCount(1);
  await expect(reachableNode).toBeEnabled();
  await expect(hiddenNode).toBeDisabled();

  const previousNodeId = await currentNode.getAttribute('id');
  const targetNodeId = await reachableNode.getAttribute('id');
  expect(previousNodeId).not.toBeNull();
  expect(targetNodeId).not.toBeNull();

  await page.locator(`#${targetNodeId}`).click();
  await expect(page.locator(`#${targetNodeId}`)).toHaveAttribute('aria-current', 'step');
  await expect(page.locator(`#${previousNodeId}`)).not.toHaveAttribute('aria-current', 'step');
});

test('迷迭香状态页使用可替换空白立绘且没有随行档案入口', async ({ page }) => {
  await page.goto('/operators');
  await expect(page.getByRole('heading', { level: 1, name: '迷迭香状态' })).toBeVisible();
  await expect(page.getByRole('img', { name: '迷迭香立绘占位' })).toHaveAttribute('src', '/assets/characters/blank-character.svg');
  await expect(page.locator('[id^="operator-dossier-open-"]')).toHaveCount(0);
});

test('档案详情与未保存批注确认保持嵌套层级', async ({ page }) => {
  await page.goto('/archive');
  await page.getByRole('tab', { name: '叙事档案' }).click();
  const trigger = page.locator('#archive-detail-open-archive-wet-record');
  await trigger.click();
  await expect(page.getByRole('dialog', { name: '潮湿的儿童病历' })).toBeVisible();
  await page.locator('#archive-note-input').fill('追踪雨水样本与广播频谱的重合区间。');
  await page.locator('#archive-detail-close-confirm').click();
  await expect(page.getByRole('dialog', { name: '批注尚未保存' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '批注尚未保存' })).toBeHidden();
  await expect(page.getByRole('dialog', { name: '潮湿的儿童病历' })).toBeVisible();
  await page.locator('#archive-detail-close-confirm').click();
  await page.locator('#archive-unsaved-discard').click();
  await expect(trigger).toBeFocused();
});

test('行动记录剧情回溯支持键盘关闭', async ({ page }) => {
  await page.goto('/log');
  await page.getByRole('tab', { name: '战术时间线' }).click();
  await closesWithEscapeAndRestoresFocus(page, 'log-replay-open-log-check', '剧情回溯');
});

test('设置恢复确认弹层支持键盘关闭', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('tab', { name: '视觉与辅助' }).click();
  await closesWithEscapeAndRestoresFocus(page, 'settings-reset-open', '确认恢复演示');
});
