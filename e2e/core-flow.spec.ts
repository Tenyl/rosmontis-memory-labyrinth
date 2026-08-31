import { expect, test } from '@playwright/test';
import { configureMockApi, installStructuredLlmMock, type MockLlmRequest } from './helpers/mockLlm';
import { settleVisibleEncounter } from './helpers/run';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
});

test('AI 导演节点结算写入当前 Run 的独立会话摘要', async ({ page }) => {
  const requests: MockLlmRequest[] = [];
  await installStructuredLlmMock(page, requests);
  await page.goto('/game');
  await configureMockApi(page);
  await page.locator('#global-brand-home').click();
  await page.getByRole('button', { name: '开始游戏' }).click();
  await page.locator('#title-content-ai').check();
  await page.getByRole('button', { name: /存档槽 3/ }).click();

  await page.locator('button[data-node-state="reachable"]').first().click();
  await expect(page.getByRole('heading', { name: '被雨声留下的门' })).toBeVisible();
  await settleVisibleEncounter(page);

  await expect.poll(() => page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('SillyTavernWebDB');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const chats = await new Promise<Array<{ purpose?: string; runId?: string | null; summaries?: unknown[] }>>((resolve, reject) => {
      const request = database.transaction('chats', 'readonly').objectStore('chats').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return chats.find((chat) => chat.purpose === 'game-run' && chat.runId)?.summaries?.length ?? 0;
  })).toBeGreaterThan(0);
  expect(requests.some((request) => request.task === 'event')).toBe(true);
});
