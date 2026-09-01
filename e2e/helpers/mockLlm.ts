import { expect, type Page } from '@playwright/test';

export type MockLlmTask = 'event' | 'quote' | 'diary' | 'novel' | 'mindsea' | 'tactical-command' | 'character-chat';

export interface MockLlmRequest {
  task: MockLlmTask;
  system: string;
  user: string;
  context: Record<string, unknown>;
}

export async function configureMockApi(page: Page) {
  if (!await page.locator('#settings-api-base-url').isVisible().catch(() => false)) {
    await page.goto('/settings');
  }
  await page.locator('#settings-api-base-url').fill('http://127.0.0.1:4617/mock-llm');
  await page.locator('#settings-api-model').fill('playwright-structured-model');
  await page.locator('#settings-api-key').fill('sk-playwright-only');
  await page.locator('#settings-api-save').click();
  await expect(page.getByText('接口配置已保存')).toBeVisible();
  await page.locator('#nav-game-open').click();
}

export function installStructuredLlmMock(
  page: Page,
  requests: MockLlmRequest[],
  mutate?: (request: MockLlmRequest, content: Record<string, unknown>) => Record<string, unknown> | string,
) {
  return page.route('**/chat/completions', async (route) => {
    const body = route.request().postDataJSON() as { messages: Array<{ role: string; content: string }> };
    const system = body.messages.filter((message) => message.role === 'system').map((message) => message.content).join('\n');
    const user = [...body.messages].reverse().find((message) => message.role === 'user')?.content ?? '';
    const contextText = user.match(/<game_snapshot_json>(\{[\s\S]*\})<\/game_snapshot_json>/)?.[1] ?? '{}';
    const context = JSON.parse(contextText) as Record<string, unknown>;
    const schemaText = system.match(/JSON Schema：(\{[\s\S]*\})\s*$/)?.[1];
    const schema = schemaText ? JSON.parse(schemaText) as Record<string, unknown> : {};
    if (Array.isArray(schema.nodeBriefs)) {
      context.nodes = schema.nodeBriefs.map((node) => {
        const item = node as { nodeId: string; nodeType: string };
        return { id: item.nodeId, type: item.nodeType };
      });
    }
    const taskMatch = system.match(/任务类型：(event|quote|diary|novel|mindsea|tactical-command)/);
    const task = (taskMatch?.[1] ?? 'character-chat') as MockLlmTask;
    const request = { task, system, user, context };
    requests.push(request);

    let content: Record<string, unknown>;
    if (task === 'event') {
      const nodeType = String(context.nodeType ?? 'safehouse');
      const choiceIds: Record<string, string[]> = {
        combat: ['combat-breach', 'combat-guard'],
        'emergency-combat': ['combat-breach', 'combat-guard'],
        safehouse: ['rest-stabilize', 'rest-vent'],
        shop: ['leave-shop'],
        encounter: ['wonder-observe', 'wonder-anchor'],
        dilemma: ['dilemma-release-pain', 'dilemma-keep-instinct'],
        unknown: ['unknown-enter'],
        boss: ['boss-breach', 'boss-resonate'],
      };
      content = {
        version: 1,
        nodeId: context.nodeId,
        nodeType,
        title: '被雨声留下的门',
        description: '潮湿的金属门后传来一段已经遗忘的呼吸声。',
        choiceIds: choiceIds[nodeType] ?? ['unknown-enter'],
        modifierIds: [],
        ...(['combat', 'emergency-combat'].includes(nodeType) ? { enemyPlan: { intentIds: ['assault', 'charge', 'erosion'] } } : {}),
        quote: '博士，我听见那段雨声了。',
      };
    } else if (task === 'quote') {
      content = { text: '我会和博士继续走。' };
    } else if (task === 'diary') {
      content = { title: '雨声变轻以后', body: '我记得博士一直在这里，所以这条路没有那么冷。' };
    } else if (task === 'tactical-command') {
      content = { version: 1, actionIds: ['sword:watch'], explanation: '先展开门扉，稳住这一轮。' };
    } else if (task === 'character-chat') {
      content = { text: '<maintext>博士，我在听。现在没有战斗，我们可以慢慢说。</maintext><sum>迷迭香回应了博士</sum>' };
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
    const serialized = task === 'character-chat' && typeof output !== 'string'
      ? String((output as { text?: string }).text ?? '')
      : typeof output === 'string' ? output : JSON.stringify(output);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content: serialized } }] }),
    });
  });
}
