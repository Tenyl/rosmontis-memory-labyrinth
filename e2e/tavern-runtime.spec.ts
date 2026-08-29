import { expect, test } from '@playwright/test';

test('新会话可完成本地回合、刷新恢复变量并建立来源分支', async ({ page }) => {
  await page.goto('/operation');
  await expect(page.getByRole('button', { name: /当前会话：雨幕回声/ })).toBeVisible();

  await page.locator('#global-tavern-open').click();
  await page.locator('#tavern-session-create-open').click();
  await page.locator('#tavern-session-create-name').fill('低温病历复核');
  await page.getByRole('button', { name: '创建并载入' }).click();
  await expect(page.getByRole('dialog', { name: '新建会话' })).toBeHidden();
  await page.locator('#tavern-orchestrator-dialog-close').click();
  await expect(page.getByRole('button', { name: /当前会话：低温病历复核/ })).toBeVisible();

  await page.getByRole('button', { name: '让迷迭香读取残留意识' }).click();
  await page.getByRole('button', { name: '发送战术指令' }).click();
  await expect(page.getByRole('button', { name: '选择：检查门牌背面的刻痕' })).toBeVisible();
  await page.getByRole('button', { name: '选择：检查门牌背面的刻痕' }).click();
  await expect(page.locator('#operation-command-input')).toHaveValue('检查门牌背面的刻痕');
  await page.getByRole('button', { name: '发送战术指令' }).click();
  await expect(page.getByText('回合完成').last()).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: /当前会话：低温病历复核/ })).toBeVisible();
  await expect(page.getByText(/门后传来三个频率完全相同的呼吸声/)).toBeVisible();
  await page.locator('#global-tavern-open').click();
  await page.locator('#tavern-tab-variables').click();
  await expect(page.getByLabel('变量 rosmontis_stress 的值')).toHaveValue('43');
  await page.locator('#tavern-orchestrator-dialog-close').click();

  await page.locator('#tavern-history-open').click();
  await page.getByRole('button', { name: /从第 \d+ 条消息创建分支/ }).last().click();
  await expect(page.getByRole('button', { name: /当前会话：低温病历复核 \/ 分支 1/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: /行动记录/ }).click();
  await expect(page.getByRole('treeitem', { name: '低温病历复核 / 分支 1' })).toContainText(/消息 \d+ \/ 回合 \d+/);
});
