import { expect, test } from '@playwright/test';
import { clearPresetRun } from './helpers/run';

test.setTimeout(200_000);

test('离线预设迷宫完整通过五层并覆盖八类节点', async ({ page }) => {
  const browserProblems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') browserProblems.push(message.text());
  });
  page.on('pageerror', (error) => browserProblems.push(error.message));

  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/game');
  await expect(page.getByRole('heading', { name: '记忆潜入控制' })).toBeVisible();

  const encountered = new Set<string>();
  const floorTopologies = new Map<number, Set<string>>();
  await clearPresetRun(
    page,
    (kind) => encountered.add(kind),
    (floor, labels) => floorTopologies.set(floor, new Set(labels)),
  );

  const victory = page.getByRole('dialog', { name: '潜入完成：记忆迷宫已逃离' });
  await expect(victory).toBeVisible();
  await expect(victory.getByText('本地无尽模式已解锁。')).toBeVisible();
  await expect(page.locator('.run-status-mission')).toContainText('第 5 / 5 层');
  expect([...floorTopologies.keys()]).toEqual([1, 2, 3, 4, 5]);

  const allNodeTypes = new Set([...floorTopologies.values()].flatMap((labels) => [...labels]));
  for (const label of [
    '常规作战',
    '紧急作战',
    '安全屋',
    '认知黑市',
    '奇境',
    '命运抉择',
    '未知',
    '领袖之敌',
  ]) expect(allNodeTypes.has(label), `五层拓扑应包含“${label}”`).toBe(true);
  for (const kind of ['rest', 'combat', 'shop', 'wonder', 'unknown', 'boss']) {
    expect(encountered.has(kind), `可见路径应实际结算 ${kind} 遭遇`).toBe(true);
  }

  await victory.getByRole('button', { name: '重新开始预设迷宫' }).click();
  await page.locator('#nav-compendium-open').click();
  await expect(page.getByRole('heading', { name: '记忆图鉴' })).toBeVisible();
  await expect(page.getByText('核心记忆：仍被呼唤的名字')).toBeVisible();
  await page.locator('#nav-records-open').click();
  await expect(page.getByRole('region', { name: 'Run 历史' })).toContainText('PRESET-RAIN-ECHO');
  await page.locator('#nav-game-open').click();

  const endlessMode = page.locator('#run-mode-endless');
  await expect(endlessMode).toBeEnabled();
  await endlessMode.check();
  await page.locator('#run-seed-input').fill('PLAYWRIGHT-ENDLESS-01');
  await page.getByRole('button', { name: '开始新的记忆潜入' }).click();
  await expect(page.locator('.run-status-mission')).toContainText('本地无尽');
  await expect(page.locator('#run-seed-input')).toHaveValue('PLAYWRIGHT-ENDLESS-01');
  expect(browserProblems).toEqual([]);
});
