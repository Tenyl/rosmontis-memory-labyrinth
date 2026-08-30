import { expect, type Page } from '@playwright/test';

const ENCOUNTER_BUTTONS = {
  shop: '#btn-leave-encounter-shop',
  wonder: '#btn-encounter-wonder-observe',
  unknown: '#btn-encounter-unknown-enter',
} as const;

async function clickWhileEnabled(page: Page, selector: string, limit: number) {
  const button = page.locator(selector);
  for (let index = 0; index < limit; index += 1) {
    if (!await button.isVisible().catch(() => false) || !await button.isEnabled()) break;
    await button.click();
  }
}

export async function resolveOverflow(page: Page) {
  const overflow = page.getByRole('dialog', { name: '记忆槽位溢出：必须遗忘' });
  if (await overflow.isVisible().catch(() => false)) {
    await overflow.getByRole('button', { name: /放弃新碎片/ }).click();
    await expect(overflow).toBeHidden();
  }
}

export async function settleVisibleEncounter(page: Page): Promise<string> {
  await expect(page.getByRole('heading', { level: 1, name: '作战主控台' })).toBeVisible();
  const panel = page.locator('.encounter-panel');
  await expect(panel).toBeVisible();
  const kind = (await panel.getAttribute('class'))?.match(/is-(combat|rest|shop|wonder|unknown|boss)/)?.[1] ?? 'unknown';

  if (kind === 'combat') {
    const guard = page.locator('#btn-encounter-combat-guard');
    if (await guard.isVisible().catch(() => false) && await guard.isEnabled()) await guard.click();
    await clickWhileEnabled(page, '#btn-encounter-combat-breach', 4);
  }
  else if (kind === 'boss') {
    await clickWhileEnabled(page, '#btn-encounter-boss-breach', 4);
    await clickWhileEnabled(page, '#btn-encounter-boss-resonate', 5);
  } else if (kind === 'rest') {
    const overload = Number(await page.locator('#meter-run-overload').getAttribute('aria-valuenow'));
    const choice = overload >= 20 ? '#btn-encounter-rest-vent' : '#btn-encounter-rest-stabilize';
    const button = page.locator(choice);
    if (await button.isVisible().catch(() => false) && await button.isEnabled()) await button.click();
  } else {
    const selector = ENCOUNTER_BUTTONS[kind as keyof typeof ENCOUNTER_BUTTONS];
    if (selector) {
      const button = page.locator(selector);
      if (await button.isVisible().catch(() => false) && await button.isEnabled()) await button.click();
    }
  }

  await resolveOverflow(page);
  return kind;
}

export async function advanceFloorIfAvailable(page: Page): Promise<boolean> {
  const advance = page.locator('#btn-advance-run-floor');
  if (!await advance.isVisible().catch(() => false)) return false;
  await advance.click();
  await expect(page.locator('.encounter-panel')).toBeVisible();
  return true;
}

export async function enterReachableNode(page: Page, preferredLabels: readonly string[] = []) {
  await page.locator('#nav-memory-open').click();
  await expect(page.getByRole('heading', { level: 1, name: '意识战场' })).toBeVisible();
  const reachable = page.locator('button[data-node-state="reachable"]');
  await expect(reachable.first()).toBeVisible();

  let selected = reachable.first();
  for (const label of preferredLabels) {
    const match = reachable.filter({ has: page.locator(`strong:text-is("${label}")`) }).first();
    if (await match.count()) {
      selected = match;
      break;
    }
  }
  await selected.click();
  await page.locator('button[id^="btn-enter-node-"]').click();
  await page.locator('#nav-operation-open').click();
  await expect(page.getByRole('heading', { level: 1, name: '作战主控台' })).toBeVisible();
}

export async function clearPresetRun(page: Page, onEncounter?: (kind: string) => void) {
  const encountered = new Set<string>();
  const labels = [
    ['shop', '商店'],
    ['wonder', '奇境'],
    ['unknown', '未知'],
    ['combat', '战斗'],
    ['rest', '休息处'],
    ['boss', 'Boss 房'],
  ] as const;
  for (let step = 0; step < 40; step += 1) {
    const victory = page.getByRole('dialog', { name: '潜入完成：记忆迷宫已逃离' });
    if (await victory.isVisible().catch(() => false)) return;

    const kind = await settleVisibleEncounter(page);
    encountered.add(kind);
    onEncounter?.(kind);
    if (await victory.isVisible().catch(() => false)) return;
    const defeat = page.getByRole('dialog', { name: '潜入失败：认知链路中断' });
    if (await defeat.isVisible().catch(() => false)) throw new Error('预设 Run 在可见流程中进入失败状态。');
    if (await advanceFloorIfAvailable(page)) continue;
    const overload = Number(await page.locator('#meter-run-overload').getAttribute('aria-valuenow'));
    const preferred = labels
      .filter(([type]) => !encountered.has(type))
      .map(([, label]) => label);
    if (overload >= 50) preferred.unshift('休息处');
    await enterReachableNode(page, [...preferred, '休息处', '商店', '奇境', '未知', '战斗', 'Boss 房']);
  }
  throw new Error('预设 Run 未能在 40 个可见交互步骤内完成。');
}
