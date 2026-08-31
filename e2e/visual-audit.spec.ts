import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'tablet-landscape-1024x768', width: 1024, height: 768 },
  { name: 'tablet-portrait-768x1024', width: 768, height: 1024 },
  { name: 'mobile-375x812', width: 375, height: 812 },
] as const;

const routes = [
  ['/game', '迷迭香的记忆迷宫'],
  ['/compendium', '记忆图鉴'],
  ['/diary', '迷迭香手记'],
  ['/records', '探索记录'],
  ['/settings', '系统设置'],
] as const;

test('生成四组视口的完整视觉验收联络表', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const runtimeErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => runtimeErrors.push(`page: ${error.message}`));
  await page.addInitScript(() => window.localStorage.clear());

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const captures: Array<{ label: string; dataUrl: string }> = [];

    for (const [route, title] of routes) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      const root = page.locator('.route-page');
      await root.evaluate(async (element) => {
        await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
      });
      const metrics = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      expect(metrics.scroll).toBeLessThanOrEqual(metrics.client);
      const image = await page.screenshot({
        animations: 'disabled',
        path: testInfo.outputPath(`${viewport.name}-${route.slice(1)}.png`),
        type: 'png',
      });
      captures.push({ label: `${title} · ${route}`, dataUrl: `data:image/png;base64,${image.toString('base64')}` });
    }

    await page.setViewportSize({ width: 1160, height: 820 });
    await page.setContent(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>
      *{box-sizing:border-box}body{margin:0;padding:24px;background:#05080c;color:#e6edf3;font-family:"Microsoft YaHei UI",sans-serif}
      h1{margin:0 0 18px;font-size:22px;letter-spacing:.06em}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
      figure{margin:0;padding:10px;border:1px solid #304552;background:#0b1117}img{display:block;width:100%;height:210px;object-fit:contain;background:#020407}
      figcaption{padding-top:8px;color:#9cb3c0;font-size:13px}.meta{color:#72d8ff;font:12px Consolas,monospace}
    </style><body><h1>迷迭香的记忆迷宫 · <span class="meta">${viewport.width}×${viewport.height}</span></h1><div class="grid">${captures.map((capture) => `<figure><img alt="" src="${capture.dataUrl}"><figcaption>${capture.label}</figcaption></figure>`).join('')}</div></body></html>`);
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-contact-sheet.png`), fullPage: true, type: 'png' });
  }

  expect(runtimeErrors).toEqual([]);
});
