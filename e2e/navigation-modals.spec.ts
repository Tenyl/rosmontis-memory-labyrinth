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

test('意识战场支持拓建与高危节点确认弹层', async ({ page }) => {
  await page.goto('/memory');
  await page.locator('#memory-node-memory-sanatorium').click();
  await closesWithEscapeAndRestoresFocus(page, 'memory-expand-down', '确认意识路径拓建');

  await page.locator('#memory-node-memory-r09').click();
  await closesWithEscapeAndRestoresFocus(page, 'memory-node-enter', '高危节点进入确认');
});

test('干员完整档案支持键盘关闭', async ({ page }) => {
  await page.goto('/operators');
  await closesWithEscapeAndRestoresFocus(page, 'operator-dossier-open-amiya', '阿米娅战术档案');
});

test('档案详情与未保存批注确认保持嵌套层级', async ({ page }) => {
  await page.goto('/archive');
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
  await closesWithEscapeAndRestoresFocus(page, 'log-replay-open-log-check', '剧情回溯');
});

test('设置恢复确认弹层支持键盘关闭', async ({ page }) => {
  await page.goto('/settings');
  await closesWithEscapeAndRestoresFocus(page, 'settings-reset-open', '确认恢复演示');
});

