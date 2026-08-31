import { expect, type Page } from '@playwright/test';

async function encounterResolved(page: Page) {
  return page.locator('.encounter-panel > header > strong.is-complete').isVisible().catch(() => false);
}

async function settleWithTacticalCards(page: Page, kind: 'combat' | 'boss') {
  for (let turn = 0; turn < 30; turn += 1) {
    if (await encounterResolved(page)) return;
    const preferred = kind === 'boss'
      ? ['#btn-greatsword-breach', '#btn-greatsword-resonance', '#btn-boss-hold-hand']
      : ['#btn-greatsword-breach'];
    let acted = false;
    for (const selector of preferred) {
      const button = page.locator(selector);
      if (await button.isVisible().catch(() => false) && await button.isEnabled()) {
        await button.click();
        acted = true;
        break;
      }
    }
    if (!acted) {
      const recover = page.locator('#btn-recover-tactical-turn');
      await expect(recover).toBeEnabled();
      await recover.click();
    }
  }
  throw new Error(`${kind} 遭遇未能在 30 次战术卡操作内结算。`);
}

export async function resolveOverflow(page: Page, waitForPotential = false) {
  const overflow = page.getByRole('dialog', { name: '记忆槽位溢出：必须遗忘' });
  if (waitForPotential) await overflow.waitFor({ state: 'visible', timeout: 500 }).catch(() => undefined);
  if (await overflow.isVisible().catch(() => false)) {
    await overflow.getByRole('button', { name: /放弃新碎片/ }).click();
    await expect(overflow).toBeHidden();
  }
}

export async function settleVisibleEncounter(page: Page): Promise<string> {
  await expect(page.getByRole('heading', { level: 1, name: '迷迭香的记忆迷宫' })).toBeVisible();
  const panel = page.locator('.encounter-panel');
  await expect(panel).toBeVisible();
  const panelClass = await panel.getAttribute('class') ?? '';
  const rawKind = panelClass.includes('is-emergency-combat')
    ? 'combat'
    : panelClass.match(/is-(combat|safehouse|shop|encounter|dilemma|unknown|boss)/)?.[1] ?? 'unknown';
  const kind = rawKind === 'safehouse' ? 'rest' : rawKind === 'encounter' || rawKind === 'dilemma' ? 'wonder' : rawKind;

  if (kind === 'combat') {
    await comfortBeforeTravel(page);
    await settleWithTacticalCards(page, 'combat');
  }
  else if (kind === 'boss') {
    await settleWithTacticalCards(page, 'boss');
  } else if (kind === 'shop') {
    await page.locator('#btn-leave-encounter-shop').click();
  } else if (kind === 'rest') {
    const overload = Number(await page.locator('#meter-run-overload').getAttribute('aria-valuenow'));
    const preferred = page.locator(overload >= 20 ? '#btn-encounter-rest-vent' : '#btn-encounter-rest-stabilize');
    if (await preferred.isVisible().catch(() => false) && await preferred.isEnabled()) await preferred.click();
    else await page.locator('.encounter-choice-grid button:not([disabled])').first().click();
  } else {
    const firstChoice = page.locator('.encounter-choice-grid button:not([disabled])').first();
    await expect(firstChoice).toBeVisible();
    await firstChoice.click();
  }

  await resolveOverflow(page, true);
  return kind;
}

async function comfortBeforeTravel(page: Page) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const overload = Number(await page.locator('#meter-run-overload').getAttribute('aria-valuenow'));
    if (overload < 50) return;
    const holdHand = page.locator('#btn-companion-hold-hand');
    const touchForehead = page.locator('#btn-companion-touch-forehead');
    if (await holdHand.isEnabled().catch(() => false)) await holdHand.click();
    else if (await touchForehead.isEnabled().catch(() => false)) await touchForehead.click();
    else return;
  }
}

export async function advanceFloorIfAvailable(page: Page): Promise<boolean> {
  await resolveOverflow(page);
  const advance = page.locator('#btn-advance-run-floor');
  if (!await advance.isVisible().catch(() => false)) return false;
  await advance.click();
  await expect(page.locator('.encounter-panel')).toBeVisible();
  return true;
}

export async function enterReachableNode(page: Page, preferredLabels: readonly string[] = []) {
  await resolveOverflow(page);
  const returnButton = page.locator('#game-return-to-maze');
  if (await returnButton.isVisible().catch(() => false)) {
    await expect(returnButton).toBeEnabled();
    await returnButton.click();
  }
  await expect(page.locator('[data-scene-phase="map"]')).toBeVisible();
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
  await expect(page.locator('[data-scene-phase="node"]')).toBeVisible();
  await expect(page).toHaveURL(/\/game$/);
}

export async function clearPresetRun(
  page: Page,
  onEncounter?: (kind: string) => void,
  onFloorTopology?: (floor: number, nodeTypeLabels: readonly string[]) => void,
) {
  const encountered = new Set<string>();
  const inspectedFloors = new Set<number>();
  const labels = [
    ['shop', '认知黑市'],
    ['wonder', '奇境'],
    ['unknown', '未知'],
    ['combat', '常规作战'],
    ['rest', '安全屋'],
    ['boss', '领袖之敌'],
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
    await comfortBeforeTravel(page);
    await resolveOverflow(page);
    if (await defeat.isVisible().catch(() => false)) throw new Error('陪伴交互后 Run 意外进入失败状态。');
    if (onFloorTopology) {
      const floorText = await page.locator('.run-status-mission').innerText();
      const floor = Number(floorText.match(/第\s*(\d+)\s*\/\s*\d+\s*层/)?.[1] ?? 0);
      if (floor > 0 && !inspectedFloors.has(floor)) {
        inspectedFloors.add(floor);
        await page.locator('#game-return-to-maze').click();
        await expect(page.locator('[data-scene-phase="map"]')).toBeVisible();
        const nodeLabels = await page.locator('button[id^="game-maze-node-"] strong').allTextContents();
        onFloorTopology(floor, nodeLabels.map((label) => label.trim()));
      }
    }
    if (await advanceFloorIfAvailable(page)) continue;
    const overload = Number(await page.locator('#meter-run-overload').getAttribute('aria-valuenow'));
    const preferred = labels
      .filter(([type]) => !encountered.has(type))
      .map(([, label]) => label);
    if (overload >= 50) preferred.unshift('安全屋');
    await enterReachableNode(page, [...preferred, '安全屋', '认知黑市', '奇境', '未知', '常规作战', '领袖之敌']);
  }
  throw new Error('预设 Run 未能在 40 个可见交互步骤内完成。');
}
