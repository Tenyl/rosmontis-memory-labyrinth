import { expect, test } from '@playwright/test';
import { configureMockApi, installStructuredLlmMock, type MockLlmRequest } from './helpers/mockLlm';

test('本地与 AI 导演共用节点模板且本地模式不显示 AI 控件', async ({ page }) => {
  const requests: MockLlmRequest[] = [];
  await installStructuredLlmMock(page, requests);
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem('e2e-storage-initialized')) return;
    window.localStorage.clear();
    window.sessionStorage.setItem('e2e-storage-initialized', 'true');
  });
  await page.goto('/');
  await page.getByRole('button', { name: '开始游戏' }).click();
  await page.getByRole('button', { name: /存档槽 1/ }).click();

  await expect(page.locator('[data-scene-phase="map"]')).toBeVisible();
  await page.locator('button[data-node-state="reachable"]').first().click();
  await expect(page.locator('[data-scene-phase="node"]')).toBeVisible();
  await expect(page.getByTestId('shared-node-template')).toBeVisible();
  await expect(page.locator('#game-director-status')).toHaveCount(0);
  await expect(page.locator('#game-ai-command-slot')).toHaveCount(0);
  expect(requests).toHaveLength(0);
});

test('AI 存档使用绑定会话生成节点并在刷新后复用已接受内容', async ({ page }) => {
  const requests: MockLlmRequest[] = [];
  await installStructuredLlmMock(page, requests);
  await page.goto('/game');
  await configureMockApi(page);
  await page.locator('#global-brand-home').click();
  await page.getByRole('button', { name: '开始游戏' }).click();
  await expect(page.locator('#title-content-ai')).toBeEnabled();
  await page.locator('#title-content-ai').check();
  await page.getByRole('button', { name: /存档槽 1/ }).click();

  await page.locator('button[data-node-state="reachable"]').first().click();
  await expect(page.locator('[data-scene-phase="node"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: '被雨声留下的门' })).toBeVisible();
  await expect(page.locator('#game-director-status')).toContainText('节点叙事已融合');
  await expect.poll(() => requests.filter((request) => request.task === 'event').length).toBe(1);
  await expect.poll(() => page.evaluate(() => {
    const persisted = JSON.parse(window.localStorage.getItem('rhodes-cognition-terminal-state') ?? '{}') as { state?: { run?: { contentMode?: string } } };
    return persisted.state?.run?.contentMode ?? 'missing';
  })).toBe('ai-director');

  await page.reload();
  await expect(page.getByRole('heading', { name: '被雨声留下的门' })).toBeVisible();
  await expect.poll(() => requests.filter((request) => request.task === 'event').length).toBe(1);
});

test('AI 节点校验失败时提供重试与本地回退选择', async ({ page }) => {
  const requests: MockLlmRequest[] = [];
  await installStructuredLlmMock(page, requests, (request, content) => request.task === 'event' ? '{"version":1,"越权":true}' : content);
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/game');
  await configureMockApi(page);
  await page.locator('#global-brand-home').click();
  await page.getByRole('button', { name: '开始游戏' }).click();
  await page.locator('#title-content-ai').check();
  await page.getByRole('button', { name: /存档槽 2/ }).click();
  await page.locator('button[data-node-state="reachable"]').first().click();

  await expect(page.getByRole('button', { name: '重试' })).toBeVisible();
  await expect(page.getByRole('button', { name: '本节点使用本地内容' })).toBeVisible();
  await page.getByRole('button', { name: '本节点使用本地内容' }).click();
  await expect(page.locator('#game-director-status')).toContainText('节点叙事已融合');
});
