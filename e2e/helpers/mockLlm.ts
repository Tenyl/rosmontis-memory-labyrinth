import { expect, type Page } from '@playwright/test';

export type MockLlmTask = 'event' | 'quote' | 'diary' | 'novel';

export interface MockLlmRequest {
  task: MockLlmTask;
  system: string;
  user: string;
  context: Record<string, unknown>;
}

export async function configureMockApi(page: Page) {
  await page.locator('#nav-settings-open').click();
  await page.locator('#settings-api-base-url').fill('http://127.0.0.1:4617/mock-llm');
  await page.locator('#settings-api-model').fill('playwright-structured-model');
  await page.locator('#settings-api-key').fill('sk-playwright-only');
  await page.locator('#settings-api-save').click();
  await expect(page.getByText('接口配置已保存')).toBeVisible();
  await page.locator('#nav-operation-open').click();
}

export function installStructuredLlmMock(
  page: Page,
  requests: MockLlmRequest[],
  mutate?: (request: MockLlmRequest, content: Record<string, unknown>) => Record<string, unknown> | string,
) {
  return page.route('**/chat/completions', async (route) => {
    const body = route.request().postDataJSON() as { messages: Array<{ role: string; content: string }> };
    const system = body.messages.find((message) => message.role === 'system')?.content ?? '';
    const user = [...body.messages].reverse().find((message) => message.role === 'user')?.content ?? '';
    const contextText = user.match(/<game_context_json>([\s\S]*?)<\/game_context_json>/)?.[1] ?? '{}';
    const context = JSON.parse(contextText) as Record<string, unknown>;
    const task: MockLlmTask = system.includes('独立突发事件')
      ? 'event'
      : system.includes('即时独白')
        ? 'quote'
        : system.includes('简短手记')
          ? 'diary'
          : 'novel';
    const request = { task, system, user, context };
    requests.push(request);

    let content: Record<string, unknown>;
    if (task === 'event') {
      content = {
        title: '被雨声留下的门',
        situation: '潮湿的金属门后传来一段已经遗忘的呼吸声。',
        choices: [
          { id: 'scan-the-door', label: '检查门缝', description: '先确认残响的来源。', intent: 'scan', check: { attribute: 'perception', threshold: 12 } },
          { id: 'guard-and-wait', label: '守在原地', description: '让神经负荷先恢复稳定。', intent: 'guard', check: { attribute: 'stability', threshold: 10 } },
        ],
      };
    } else if (task === 'quote') {
      content = { text: '我会和博士继续走。' };
    } else if (task === 'diary') {
      content = { title: '雨声变轻以后', body: '我记得博士一直在这里，所以这条路没有那么冷。' };
    } else {
      const nodes = context.nodes as Array<{ id: string; type: string }>;
      const floor = Number(context.floor ?? 0);
      content = {
        title: floor >= 6 ? '荒原极光下的并肩漫行' : 'Playwright 无声列车',
        theme: floor >= 6 ? '释怀后的荒原极光' : '拒绝抵达清晨的记忆列车',
        premise: floor >= 6 ? '迷迭香与博士沿极光寻找新的风景。' : '迷迭香沿本地拓扑寻找被擦除的站名。',
        endingHook: '前方仍有一段可以一起走完的路。',
        nodeBriefs: nodes.map((node, index) => ({
          nodeId: node.id,
          nodeType: node.type,
          title: `测试节点 ${index + 1}`,
          description: `第 ${index + 1} 个节点的远程叙事只读附注。`,
        })),
      };
    }

    const output = mutate?.(request, content) ?? content;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content: typeof output === 'string' ? output : JSON.stringify(output) } }] }),
    });
  });
}
