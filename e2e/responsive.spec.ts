import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 1000 },
] as const;

const routes = [
  ['/operation', '作战主控台'],
  ['/memory', '意识战场'],
  ['/operators', '干员与小队'],
  ['/archive', '情报档案库'],
  ['/log', '行动记录'],
  ['/settings', '系统设置'],
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

test('375 像素意识战场默认切换为战术列表', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/memory');
  await expect(page.getByRole('heading', { name: '节点战术列表' })).toBeVisible();
  await expect(page.locator('#memory-view-switch-list')).toHaveAttribute('aria-pressed', 'true');
});
test('减少动效偏好通过设置页实时应用到根节点', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/settings');
  await page.getByRole('tab', { name: '视觉与辅助' }).click();
  await page.getByRole('radio', { name: '减少动效' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('.route-page')).toHaveCSS('animation-name', 'none');
});

for (const viewport of viewports) {
  test(`${viewport.name} 酒馆编排保持在视口内并满足移动触控尺寸`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/operation');
    await page.locator('#global-tavern-open').click();
    const dialog = page.getByRole('dialog', { name: '酒馆编排中枢' });
    await expect(dialog).toBeVisible();
    await dialog.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
    });
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    if (viewport.width <= 767) {
      const closeBox = await page.locator('#tavern-orchestrator-dialog-close').boundingBox();
      expect(closeBox!.width).toBeGreaterThanOrEqual(44);
      expect(closeBox!.height).toBeGreaterThanOrEqual(44);
    }
  });
}
