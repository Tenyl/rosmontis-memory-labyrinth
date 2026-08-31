import { expect, test } from '@playwright/test';
import { settleVisibleEncounter } from './helpers/run';

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 1000 },
] as const;

const routes = [
  ['/game', '迷迭香的记忆迷宫'],
  ['/compendium', '记忆图鉴'],
  ['/diary', '迷迭香手记'],
  ['/records', '探索记录'],
  ['/settings', '系统设置'],
  ['/chat', '迷迭香对话'],
] as const;

for (const viewport of viewports) {
  test.describe(`${viewport.name} ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });

    for (const [route, title] of routes) {
      test(`${route} 不产生页面级水平溢出`, async ({ page }) => {
        await page.addInitScript(() => window.localStorage.clear());
        await page.goto(route);
        await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
        const overflow = await page.evaluate(() => ({
          client: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
      });
    }
  });
}

test('375 像素下顶部菜单、地图列表和节点动作均可操作', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/game');
  await settleVisibleEncounter(page);
  await page.locator('#game-return-to-maze').click();
  await expect(page.locator('[data-scene-phase="map"]')).toBeVisible();

  await page.locator('#game-maze-view-switch-list').click();
  await expect(page.getByRole('heading', { name: '节点战术列表' })).toBeVisible();
  await expect(page.locator('.maze-context-actions .terminal-button').first()).toBeVisible();

  await page.getByRole('button', { name: '展开顶部菜单' }).click();
  await expect(page.getByRole('link', { name: '系统设置' })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('系统减少动效时节点转场在 200ms 内完成且没有无限动画', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/game');
  await settleVisibleEncounter(page);
  await page.locator('#game-return-to-maze').click();
  await expect(page.locator('[data-scene-phase="map"]')).toBeVisible();

  const reachable = page.locator('[data-node-state="reachable"]').first();
  await page.evaluate(() => {
    const stage = document.querySelector('#game-stage');
    const timing = { started: 0, duration: 0 };
    (window as typeof window & { __nodeTransitionTiming?: typeof timing }).__nodeTransitionTiming = timing;
    new MutationObserver(() => {
      const phase = stage?.getAttribute('data-scene-phase');
      if (phase === 'entering-node' && timing.started === 0) timing.started = performance.now();
      if (phase === 'node' && timing.started > 0) timing.duration = performance.now() - timing.started;
    }).observe(stage!, { attributes: true, attributeFilter: ['data-scene-phase'] });
  });
  await reachable.click();
  const transition = page.locator('.node-transition-layer');
  await expect(transition).toBeVisible();
  const infiniteAnimations = await transition.evaluate((element) => (
    element.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getTiming().iterations === Infinity).length
  ));
  expect(infiniteAnimations).toBe(0);
  await expect(page.locator('[data-scene-phase="node"]')).toBeVisible();
  const duration = await page.evaluate(() => (
    (window as typeof window & { __nodeTransitionTiming?: { duration: number } }).__nodeTransitionTiming?.duration ?? Infinity
  ));
  expect(duration).toBeLessThan(200);
});

for (const viewport of viewports) {
  test(`${viewport.name} 设置管理工作区保持在视口内`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/settings');
    if (viewport.width <= 900) {
      await page.getByRole('button', { name: '展开顶部菜单' }).click();
      await expect(page.getByRole('navigation', { name: '顶部菜单' })).toBeVisible();
    }
    await page.getByRole('tab', { name: '内容资料' }).click();
    await expect(page.getByRole('heading', { name: '世界书索引' })).toBeVisible();
    const panel = page.locator('#settings-panel-content');
    await expect.poll(async () => panel.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  });
}
