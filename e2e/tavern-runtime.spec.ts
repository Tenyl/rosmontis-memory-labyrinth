import { expect, test } from '@playwright/test';

test('新会话可完成本地回合、刷新恢复并建立来源分支', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('tab', { name: '会话管理' }).click();
  await page.locator('#tavern-session-create-open').click();
  await page.locator('#tavern-session-create-name').fill('低温病历复核');
  await page.getByRole('button', { name: '创建并载入' }).click();
  await expect(page.getByRole('dialog', { name: '新建会话' })).toBeHidden();
  await expect(page.locator('.tavern-session-card.is-active')).toContainText('低温病历复核');

  await page.locator('#nav-game-open').click();
  await page.getByRole('button', { name: '让迷迭香读取记忆回声' }).click();
  await page.getByRole('button', { name: '发送战术指令' }).click();
  await expect(page.getByRole('button', { name: '选择：在温室边缘短暂休息' })).toBeVisible();
  await page.getByRole('button', { name: '选择：在温室边缘短暂休息' }).click();
  await expect(page.locator('#operation-command-input')).toHaveValue('在温室边缘短暂休息');
  await page.getByRole('button', { name: '发送战术指令' }).click();
  await expect(page.getByText('回合完成').last()).toBeVisible();

  await page.reload();
  await expect(page.getByText(/透明墙面后长满没有气味的迷迭香/)).toBeVisible();
  await page.locator('#tavern-history-open').click();
  await page.getByRole('button', { name: /从第 \d+ 条消息创建分支/ }).last().click();
  await page.keyboard.press('Escape');

  await page.locator('#nav-settings-open').click();
  await page.getByRole('tab', { name: '会话管理' }).click();
  await expect(page.getByRole('treeitem', { name: '低温病历复核 / 分支 1' })).toContainText(/消息 \d+ \/ 回合 \d+/);
});
