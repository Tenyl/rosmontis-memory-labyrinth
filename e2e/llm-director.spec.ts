import { expect, test, type Page } from '@playwright/test';

async function settleCurrentNode(page: Page) {
  const settle = page.locator('#btn-complete-current-node');
  await expect(settle).toBeVisible();
  if (await settle.isEnabled()) await settle.click();
  const overflow = page.getByRole('dialog', { name: '记忆槽位溢出：必须遗忘' });
  if (await overflow.isVisible().catch(() => false)) {
    await overflow.getByRole('button', { name: /放弃新碎片/ }).click();
  }
}

async function unlockAfterFirstClear(page: Page) {
  for (let step = 0; step < 12; step += 1) {
    await settleCurrentNode(page);
    const stabilize = page.locator('#btn-stabilize-memory-core');
    if (await stabilize.count()) {
      await page.locator('#btn-greatsword-resonance').click();
      await stabilize.click();
      break;
    }
    await page.locator('#nav-memory-open').click();
    await page.locator('button[id^="run-maze-node-"]:not([disabled])').last().click();
    await page.locator('#nav-operation-open').click();
  }
  const victory = page.getByRole('dialog', { name: '潜入完成：记忆迷宫已逃离' });
  await expect(victory).toBeVisible();
  await victory.getByRole('button', { name: '重新开始预设迷宫' }).click();
}

test('starts a mocked novel Run and renders themed briefs on the unchanged local graph', async ({ page }) => {
  let mockedNovelRequests = 0;
  const postRequests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST') postRequests.push(request.url());
  });
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/operation');

  await page.route('**/chat/completions', async (route) => {
    mockedNovelRequests += 1;
    const request = route.request().postDataJSON() as {
      messages: Array<{ role: string; content: string }>;
    };
    const userContent = [...request.messages].reverse().find((message) => message.role === 'user')?.content ?? '';
    const contextText = userContent.match(/<game_context_json>([\s\S]*?)<\/game_context_json>/)?.[1];
    if (!contextText) throw new Error('小说蓝图请求缺少本地节点上下文。');
    const context = JSON.parse(contextText) as {
      nodes: Array<{ id: string; type: string }>;
    };
    const content = JSON.stringify({
      title: 'Playwright 无声列车',
      theme: '拒绝抵达清晨的记忆列车',
      premise: '迷迭香沿本地拓扑寻找被擦除的站名。',
      endingHook: '终点广播指向下一层记忆。',
      nodeBriefs: context.nodes.map((node, index) => ({
        nodeId: node.id,
        nodeType: node.type,
        title: `测试车厢 ${index + 1}`,
        description: `节点 ${index + 1} 的远程叙事只读附注。`,
      })),
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content } }] }),
    });
  });

  await unlockAfterFirstClear(page);
  await page.locator('#nav-settings-open').click();
  await page.locator('#settings-api-base-url').fill('http://127.0.0.1:4617/mock-llm');
  await page.locator('#settings-api-model').fill('playwright-novel-model');
  await page.locator('#settings-api-key').fill('sk-playwright-only');
  await page.locator('#settings-api-save').click();
  await expect(page.getByText('接口配置已保存')).toBeVisible();
  await expect(page.locator('#settings-api-base-url')).toHaveValue('http://127.0.0.1:4617/mock-llm');
  await expect(page.locator('#settings-api-model')).toHaveValue('playwright-novel-model');
  await expect(page.locator('#settings-api-key')).toHaveValue('sk-playwright-only');

  await page.locator('#nav-operation-open').click();
  await expect(page.locator('#run-mode-novel')).toBeEnabled();
  await page.locator('#run-mode-novel').check();
  await page.locator('#run-seed-input').fill('PLAYWRIGHT-NOVEL-01');
  await page.locator('#btn-start-new-run').click();
  await page.waitForTimeout(500);
  expect(postRequests).toContain('http://127.0.0.1:4617/mock-llm/chat/completions');
  expect(mockedNovelRequests).toBe(1);

  await page.locator('#nav-memory-open').click();
  const brief = page.getByRole('region', { name: '小说迷宫简报' });
  await expect(brief).toContainText('Playwright 无声列车');
  await expect(brief).toContainText('远程生成');
  const nodes = page.locator('button[id^="run-maze-node-"]');
  await expect(nodes).toHaveCount(10);
  await expect(nodes.first()).toContainText('测试车厢 1');
  await expect(page.locator('button[id^="run-maze-node-"]:not([disabled])').first()).toBeVisible();
});
