import { expect, test } from '@playwright/test';
import { clearPresetRun } from './helpers/run';
import { configureMockApi, installStructuredLlmMock, type MockLlmRequest } from './helpers/mockLlm';

test.setTimeout(240_000);

test('LLM 返回越权蓝图时保留本地拓扑与 Run 进度', async ({ page }) => {
  const requests: MockLlmRequest[] = [];
  await installStructuredLlmMock(page, requests, (request, content) => (
    request.task === 'novel'
      ? { ...content, nodeBriefs: [], damage: 9999 }
      : content
  ));
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/operation');

  await clearPresetRun(page);
  const victory = page.getByRole('dialog', { name: '潜入完成：记忆迷宫已逃离' });
  await expect(victory).toBeVisible();
  await victory.getByRole('button', { name: '重新开始预设迷宫' }).click();
  await configureMockApi(page);

  await expect(page.locator('#run-mode-novel')).toBeEnabled();
  await page.locator('#run-mode-novel').check();
  await page.locator('#run-seed-input').fill('PLAYWRIGHT-FALLBACK-01');
  await page.locator('#btn-start-new-run').click();

  await expect(page.getByText('小说蓝图已切换至本地叙事')).toBeVisible();
  await expect(page.locator('.run-status-mission')).toContainText('小说剧情');
  await expect(page.locator('.run-status-mission')).toContainText('第 1 / 5 层');
  await page.locator('#nav-memory-open').click();
  const brief = page.getByRole('region', { name: '小说迷宫简报' });
  await expect(brief).toContainText('本地回退');
  const novelRequest = requests.find((request) => request.task === 'novel');
  const authoritativeNodes = novelRequest?.context.nodes as unknown[] | undefined;
  expect(authoritativeNodes?.length).toBeGreaterThan(0);
  await expect(page.locator('button[id^="run-maze-node-"]')).toHaveCount(authoritativeNodes?.length ?? 0);
  await expect(page.locator('button[id^="run-maze-node-"]:not([disabled])').first()).toBeVisible();
});
