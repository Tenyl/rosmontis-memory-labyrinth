import { expect, test, type Download, type Locator } from '@playwright/test';

async function downloadJson(download: Download) {
  const stream = await download.createReadStream();
  stream.setEncoding('utf8');
  let text = '';
  for await (const chunk of stream) text += chunk;
  return JSON.parse(text) as Record<string, unknown>;
}

async function expectFieldsOnSeparateRows(
  container: Locator,
  selector = ':scope > label',
) {
  const fields = container.locator(selector);
  const count = await fields.count();
  expect(count).toBeGreaterThan(1);
  const tops = await fields.evaluateAll((elements) => elements.map((element) => (
    Math.round(element.getBoundingClientRect().top)
  )));
  expect(new Set(tops).size).toBe(count);
}

async function expectFieldsOnSameRow(
  container: Locator,
  selector: string,
) {
  const fields = container.locator(selector);
  const count = await fields.count();
  expect(count).toBeGreaterThan(1);
  const tops = await fields.evaluateAll((elements) => elements.map((element) => (
    Math.round(element.getBoundingClientRect().top)
  )));
  expect(new Set(tops).size).toBe(1);
}

test('单主角编排隐藏角色管理且世界书与预设支持 SillyTavern JSON 导入导出', async ({ page }) => {
  await page.goto('/operation');
  await page.locator('#global-tavern-open').click();
  await expect(page.getByRole('dialog', { name: '酒馆编排中枢' })).toBeVisible();

  await expect(page.locator('#tavern-tab-characters')).toHaveCount(0);

  await page.locator('#tavern-tab-lorebooks').click();
  await page.locator('#lorebook-import-input').setInputFiles({
    name: 'cold-ward.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ name: '低温病区索引', entries: { 0: { key: ['低温'], content: '病区温度异常。', comment: '温度记录' } } })),
  });
  await expect(page.getByText(/导入完成：成功 1 项/)).toBeVisible();
  const lorebook = page.getByRole('article', { name: '世界书 低温病区索引' });
  const lorebookDownloadEvent = page.waitForEvent('download');
  await lorebook.getByRole('button', { name: '导出世界书 低温病区索引' }).click();
  const lorebookDownload = await lorebookDownloadEvent;
  expect(lorebookDownload.suggestedFilename()).toBe('低温病区索引.json');
  expect((await downloadJson(lorebookDownload)).name).toBe('低温病区索引');

  await page.locator('#tavern-tab-presets').click();
  await page.locator('#preset-import-input').setInputFiles({
    name: 'clinical.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ name: '临床叙事预设', temp_openai: 0.55, openai_max_context: 8192 })),
  });
  const preset = page.getByRole('article', { name: '生成预设 临床叙事预设' });
  await expect(preset).toBeVisible();
  const presetDownloadEvent = page.waitForEvent('download');
  await preset.getByRole('button', { name: '导出预设 临床叙事预设' }).click();
  const presetDownload = await presetDownloadEvent;
  expect(presetDownload.suggestedFilename()).toBe('临床叙事预设.json');
  expect((await downloadJson(presetDownload)).temp_openai).toBe(0.55);
});

test('设置页在浏览器内同时报告全部必填字段错误', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: '接口连接' })).toBeVisible();
  await page.getByLabel('API 基础 URL').fill('');
  await page.getByLabel('模型名称', { exact: true }).fill('');
  await page.locator('#settings-api-save').click();
  await expect(page.getByText('请输入 API 基础 URL')).toBeVisible();
  await expect(page.getByText('请输入模型名称')).toBeVisible();
});

test('铅笔入口打开的二级编辑窗口逐项分行且不改变主设置页布局', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/operation');
  await page.locator('#global-tavern-open').click();

  await page.locator('#tavern-tab-presets').click();
  await page.locator('button[id^="preset-edit-"]').first().click();
  const presetDialog = page.getByRole('dialog', { name: '预设编辑器' });
  await expect(presetDialog).toBeVisible();
  await expectFieldsOnSeparateRows(presetDialog.locator('.tavern-sampling-grid'));
  await expect.poll(async () => presetDialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.setViewportSize({ width: 375, height: 812 });
  await expectFieldsOnSeparateRows(presetDialog.locator('.tavern-sampling-grid'));
  await expect.poll(async () => presetDialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await presetDialog.getByRole('button', { name: '关闭', exact: true }).click();

  await page.locator('#tavern-tab-lorebooks').click();
  await page.locator('button[id^="lorebook-edit-"]').first().click();
  const lorebookDialog = page.getByRole('dialog', { name: '世界书编辑器' });
  await expect(lorebookDialog).toBeVisible();
  await expectFieldsOnSeparateRows(lorebookDialog.locator('.tavern-entry-form .tavern-editor-grid').first());
  await expect.poll(async () => lorebookDialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

  await page.setViewportSize({ width: 375, height: 812 });
  await expect.poll(async () => lorebookDialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: '接口连接' })).toBeVisible();
  await expectFieldsOnSameRow(page.locator('.settings-connection-grid'), ':scope > fieldset');
  await page.getByRole('tab', { name: '解析协议' }).click();
  await expect(page.getByRole('heading', { name: '解析协议' })).toBeVisible();
  await expectFieldsOnSameRow(page.locator('.settings-parsing-layout'), ':scope > section');
});
