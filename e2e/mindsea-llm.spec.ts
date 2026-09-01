import { expect, test } from '@playwright/test';
import { clearPresetRun, settleVisibleEncounter, startLocalRun } from './helpers/run';
import { configureMockApi, installStructuredLlmMock, type MockLlmRequest } from './helpers/mockLlm';

test.setTimeout(240_000);

test('接入 LLM 后从第五层进入无垠心海并生成第六层主题', async ({ page }) => {
  const requests: MockLlmRequest[] = [];
  await installStructuredLlmMock(page, requests);
  await startLocalRun(page);
  await configureMockApi(page);

  await clearPresetRun(page);
  const victory = page.getByRole('dialog', { name: '潜入完成：记忆迷宫已逃离' });
  await expect(victory).toBeVisible();
  const continueButton = page.locator('#btn-continue-mindsea');
  await expect(continueButton).toBeVisible();
  await continueButton.click();

  await expect(victory).toBeHidden();
  await expect(page.locator('.run-status-mission')).toContainText('小说剧情');
  await expect(page.locator('.run-status-mission')).toContainText('第 6 / 6 层');
  await expect.poll(() => requests.filter((request) => request.task === 'mindsea' && Number(request.context.floor) === 6).length).toBe(1);

  await settleVisibleEncounter(page);
  await page.locator('#game-return-to-maze').click();
  await expect(page.locator('[data-scene-phase="map"]')).toBeVisible();
  const brief = page.getByRole('region', { name: '小说迷宫简报' });
  await expect(brief).toContainText('荒原极光下的并肩漫行');
  await expect(brief).toContainText('远程生成');
  await expect(page.locator('button[id^="game-maze-node-"]:not([disabled])').first()).toBeVisible();

  const mindseaRequest = requests.find((request) => request.task === 'mindsea' && Number(request.context.floor) === 6);
  expect(mindseaRequest?.system).toContain('任务类型：mindsea');
  expect(mindseaRequest?.context).toHaveProperty('nodes');
});
