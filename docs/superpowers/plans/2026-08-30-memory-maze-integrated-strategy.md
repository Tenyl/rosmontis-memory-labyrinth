# Memory Maze Integrated Strategy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable three-floor B+C hybrid roguelike with six node types, local economy and modules, memory-key events, overload-sensitive unknown nodes and Boss, greatsword exploration powers, and replaceable asset placeholders.

**Architecture:** Extend the deterministic `src/game` domain first, then expose one encounter-resolution API through the Zustand store. UI components consume domain state without calculating rewards. Static media is referenced only through a typed asset registry so the game remains playable with placeholders and future files can replace them without editing feature components.

**Tech Stack:** React 19, TypeScript 7, Zustand 5, Vite 8, Vitest 4, Testing Library, Playwright 1.62, CSS.

**Spec:** `docs/superpowers/specs/2026-08-30-memory-maze-integrated-strategy-design.md`

## Global Constraints

- Rosmontis is the only playable protagonist; do not add recruitment, squads, classes, or other controllable characters.
- One Run has exactly three floors; the third floor ends at one unique Boss node.
- Every Run contains combat, rest, shop, wonder, unknown, and Boss nodes.
- Local rules own topology, hidden node outcomes, probability, rewards, prices, and combat results.
- LLM output may change titles, prose, and temporary quotes only.
- Feature components never concatenate media paths; all external media flows through `src/assets/assetRegistry.ts`.
- Missing image and audio files must not block play.
- Use deterministic seeded randomness and immutable state transitions.
- Preserve keyboard operation and 375, 768, 1024, and 1440 responsive layouts.
- Add tests before production changes and push every completed task.

---

### Task 1: Asset placeholder contract

**Files:**
- Create: `assets/README.md`
- Create: `assets/placeholders/character-blank.svg`
- Create: `assets/placeholders/node-blank.svg`
- Create: `assets/placeholders/module-blank.svg`
- Create: `assets/images/characters/.gitkeep`
- Create: `assets/images/nodes/.gitkeep`
- Create: `assets/images/modules/.gitkeep`
- Create: `assets/audio/bgm/.gitkeep`
- Create: `assets/audio/sfx/.gitkeep`
- Create: `src/assets/assetRegistry.ts`
- Create: `src/assets/assetRegistry.test.ts`

**Interfaces:**
- Produces: `gameAssets`, `resolveImageAsset(key)`, `resolveAudioAsset(key)`, `hasAudioAsset(key)`.
- `resolveImageAsset(key: ImageAssetKey): string` always returns a usable URL.
- `resolveAudioAsset(key: AudioAssetKey): string | null` returns `null` until a real audio file is registered.

- [ ] **Step 1: Write the failing registry test**

```ts
import { describe, expect, test } from 'vitest';
import { gameAssets, resolveAudioAsset, resolveImageAsset } from './assetRegistry';

describe('asset registry', () => {
  test('returns shipped SVG placeholders for every image slot', () => {
    for (const key of Object.keys(gameAssets.images) as Array<keyof typeof gameAssets.images>) {
      expect(resolveImageAsset(key)).toMatch(/\.svg(?:\?|$)/);
    }
  });

  test('represents unfilled audio slots without constructing a broken URL', () => {
    expect(resolveAudioAsset('mazeBgm')).toBeNull();
    expect(resolveAudioAsset('bossBgm')).toBeNull();
  });
});
```

- [ ] **Step 2: Run `pnpm exec vitest run src/assets/assetRegistry.test.ts`**

Expected: FAIL because `assetRegistry.ts` does not exist.

- [ ] **Step 3: Implement the registry and placeholder assets**

```ts
import characterBlank from '../../assets/placeholders/character-blank.svg';
import nodeBlank from '../../assets/placeholders/node-blank.svg';
import moduleBlank from '../../assets/placeholders/module-blank.svg';

export const gameAssets = {
  images: {
    rosmontisPortrait: characterBlank,
    combatNode: nodeBlank,
    restNode: nodeBlank,
    shopNode: nodeBlank,
    wonderNode: nodeBlank,
    unknownNode: nodeBlank,
    bossNode: nodeBlank,
    moduleCard: moduleBlank,
  },
  audio: { mazeBgm: null, combatBgm: null, bossBgm: null, nodeOpenSfx: null },
} as const;

export type ImageAssetKey = keyof typeof gameAssets.images;
export type AudioAssetKey = keyof typeof gameAssets.audio;
export const resolveImageAsset = (key: ImageAssetKey) => gameAssets.images[key];
export const resolveAudioAsset = (key: AudioAssetKey): string | null => gameAssets.audio[key];
export const hasAudioAsset = (key: AudioAssetKey) => resolveAudioAsset(key) !== null;
```

- [ ] **Step 4: Run the focused test and `pnpm typecheck`**

Expected: registry tests PASS and TypeScript exits 0.

- [ ] **Step 5: Commit and push**

```bash
git add assets src/assets
git commit -m "feat: add replaceable game asset registry"
git push
```

### Task 2: Six-node deterministic multi-floor maze

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/maze.ts`
- Modify: `src/game/maze.test.ts`
- Modify: `src/data/demoData.ts`
- Modify: `src/game/greatswords.ts`
- Modify: `src/game/greatswords.test.ts`
- Modify: `src/game/presetEvents.ts`
- Modify: `src/game/presetEvents.test.ts`
- Modify: `src/features/memory/RunMazePanel.tsx`
- Modify: `src/features/operation/GreatswordActions.tsx`
- Modify: `src/features/operation/NodeResolutionPanel.tsx`
- Modify: `src/features/operation/narrativeEngine.ts`
- Modify: `src/llm/gameContent.ts`
- Modify: `src/llm/gamePrompts.ts`
- Modify: `src/llm/localNovelBlueprint.ts`

**Interfaces:**
- Produces: `MazeNodeType = 'combat' | 'rest' | 'shop' | 'wonder' | 'unknown' | 'boss'`.
- Produces: `generateMaze({ seed, mode, floor, maxFloor, targetNodeCount })`.
- `MazeNode` adds `risk`, `hiddenType`, `revealed`, and `modifiers`; `MazeEdge` adds `locked`.
- `MazeGraph` adds `maxFloor`.

- [ ] **Step 1: Replace maze expectations with failing six-type and determinism tests**

```ts
test('a three-floor run contains every required node type and one final boss', () => {
  const floors = [1, 2, 3].map((floor) => generateMaze({
    seed: 'SIX-TYPES', mode: 'preset', floor, maxFloor: 3, targetNodeCount: 10,
  }));
  const nodes = floors.flatMap((graph) => graph.nodes);
  expect(new Set(nodes.map((node) => node.type))).toEqual(
    new Set(['combat', 'rest', 'shop', 'wonder', 'unknown', 'boss']),
  );
  expect(nodes.filter((node) => node.type === 'boss')).toHaveLength(1);
  expect(floors[2].nodes.at(-1)?.type).toBe('boss');
});

test('unknown results are deterministic but hidden from the public type', () => {
  const first = generateMaze({ seed: 'HIDDEN', mode: 'preset', floor: 2, maxFloor: 3, targetNodeCount: 10 });
  const second = generateMaze({ seed: 'HIDDEN', mode: 'preset', floor: 2, maxFloor: 3, targetNodeCount: 10 });
  expect(first).toEqual(second);
  expect(first.nodes.filter((node) => node.type === 'unknown').every((node) => node.hiddenType && !node.revealed)).toBe(true);
});
```

- [ ] **Step 2: Run `pnpm exec vitest run src/game/maze.test.ts`**

Expected: FAIL on the old four-type union and missing `maxFloor`.

- [ ] **Step 3: Implement constrained column generation**

Create depth columns, connect every node forward, assign required types before weighted filler types, and assign `hiddenType` from `combat | rest | shop | wonder`. Keep the generated graph acyclic and use `validateMaze` to reject missing quotas, unreachable nodes, non-final Boss nodes, and exposed unknown results.

- [ ] **Step 4: Update demo state to the new generated graph shape**

Call `createRun` rather than hand-constructing old node types wherever possible. Update every exhaustive node-type record to the six new labels in the same commit so `pnpm typecheck` remains green; later tasks replace their temporary generic settlement with distinct behavior.

- [ ] **Step 5: Run `pnpm exec vitest run src/game/maze.test.ts src/game/run.test.ts src/data` and `pnpm typecheck`**

Expected: maze tests PASS and TypeScript exits 0. Exhaustive node-label records compile with all six values while their generic settlement UI remains in place until Task 6.

- [ ] **Step 6: Commit and push**

```bash
git add src/game/types.ts src/game/maze.ts src/game/maze.test.ts src/data/demoData.ts
git commit -m "feat: generate six-type multi-floor mazes"
git push
```

### Task 3: Economy and cognitive modules

**Files:**
- Create: `src/game/modules.ts`
- Create: `src/game/modules.test.ts`
- Create: `src/game/economy.ts`
- Create: `src/game/economy.test.ts`
- Modify: `src/game/types.ts`

**Interfaces:**
- Produces: `ModuleId`, `CognitiveModule`, `MODULE_CATALOG`.
- Produces: `purchaseOffer(state, offerId)`, `sellFragment(state, fragmentId)`, `applyModuleEffect(state, context)`.
- `EconomyState` is `{ echoes: number; scoutPoints: number; shopPurchases: string[] }`.

- [ ] **Step 1: Write failing economy tests**

```ts
test('purchase rejects insufficient echoes without mutation', () => {
  const before = createEconomyFixture({ echoes: 5 });
  const result = purchaseOffer(before, { id: 'offer-filter', kind: 'module', moduleId: 'overload-filter', price: 12 });
  expect(result).toEqual({ accepted: false, reason: '记忆残响不足。', state: before, events: [] });
});

test('duplicate modules cannot be purchased', () => {
  const before = createEconomyFixture({ echoes: 30, modules: ['breach-circuit'] });
  expect(purchaseOffer(before, { id: 'offer-breach', kind: 'module', moduleId: 'breach-circuit', price: 10 }).accepted).toBe(false);
});
```

- [ ] **Step 2: Run `pnpm exec vitest run src/game/economy.test.ts src/game/modules.test.ts`**

Expected: FAIL because the domain modules do not exist.

- [ ] **Step 3: Implement all eight catalog entries and immutable purchase/sale rules**

Use IDs `breach-circuit`, `watch-prism`, `perception-array`, `resonance-wire`, `overload-filter`, `memory-cache`, `echo-recycler`, and `white-noise`. Apply fragment-capacity changes through a pure module effect, and reject sale of core fragments.

- [ ] **Step 4: Run focused tests and `pnpm typecheck`**

Expected: economy and module tests PASS.

- [ ] **Step 5: Commit and push**

```bash
git add src/game/types.ts src/game/modules.ts src/game/modules.test.ts src/game/economy.ts src/game/economy.test.ts
git commit -m "feat: add memory economy and module builds"
git push
```

### Task 4: Encounter rules and greatsword exploration powers

**Files:**
- Create: `src/game/encounters.ts`
- Create: `src/game/encounters.test.ts`
- Create: `src/game/exploration.ts`
- Create: `src/game/exploration.test.ts`
- Modify: `src/game/types.ts`
- Modify: `src/game/presetEvents.ts`
- Modify: `src/game/presetEvents.test.ts`

**Interfaces:**
- Produces: `createEncounter(state, node)`, `resolveEncounterChoice(state, choiceId)`.
- Produces: `useExplorationPower(state, { swordId, nodeId?, edgeId? })`.
- Produces: `PendingEncounter` discriminated by `combat | rest | shop | wonder | unknown | boss`.
- Produces: `ExplorationCharges = Record<GreatswordId, 0 | 1>`.

- [ ] **Step 1: Write a failing table test for all encounter kinds**

```ts
test.each(['combat', 'rest', 'shop', 'wonder', 'unknown', 'boss'] as const)(
  'creates a deterministic %s encounter',
  (type) => {
    const before = runAtNode(type, 'ENCOUNTER-SEED');
    expect(createEncounter(before, currentNode(before))).toEqual(
      createEncounter(before, currentNode(before)),
    );
  },
);
```

- [ ] **Step 2: Add failing behavior tests**

Cover combat round progression, one-choice rest, shop delegation, fragment-tag wonder option, high-overload unknown weighting, unrevealed-risk bonus, two-phase Boss, empty exploration charge rejection, perception reveal, breach edge opening, watch protection, and resonance option activation.

- [ ] **Step 3: Run `pnpm exec vitest run src/game/encounters.test.ts src/game/exploration.test.ts`**

Expected: FAIL because encounter and exploration APIs do not exist.

- [ ] **Step 4: Implement pure encounter and exploration reducers**

Keep numeric effects in local templates. Unknown encounters copy the pre-generated `hiddenType`; they never draw a new type on entry. Boss phase one targets `enemyIntegrity`, phase two targets `coreStability`, and overload at 70 or above adds a deterministic glitch modifier.

- [ ] **Step 5: Run all `src/game` tests**

Run: `pnpm exec vitest run src/game`

Expected: all game-domain tests PASS.

- [ ] **Step 6: Commit and push**

```bash
git add src/game
git commit -m "feat: resolve diverse maze encounters"
git push
```

### Task 5: Run reducer, store actions, floor transition, and migration

**Files:**
- Modify: `src/game/run.ts`
- Modify: `src/game/run.test.ts`
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`
- Modify: `src/store/gameStateMigration.ts`
- Modify: `src/store/gameStateMigration.test.ts`
- Modify: `src/types/game.ts`

**Interfaces:**
- `RunAction` adds `begin-node`, `resolve-encounter`, `purchase-offer`, `sell-fragment`, `use-exploration-power`, and `advance-floor`.
- Store actions expose `beginCurrentEncounter`, `resolveEncounterChoice`, `purchaseShopOffer`, `sellRunFragment`, `useExplorationPower`, and `advanceRunFloor`.
- `selectRoguelikeState` and `applyRoguelikeState` round-trip every new domain field.

- [ ] **Step 1: Write failing three-floor lifecycle tests**

```ts
test('finishing a non-final exit builds the next floor and restores exploration charges', () => {
  const before = completedFloorFixture({ floor: 1, maxFloor: 3 });
  const result = reduceRunAction(before, { type: 'advance-floor' });
  expect(result.accepted).toBe(true);
  expect(result.state.run.floor).toBe(2);
  expect(result.state.maze.floor).toBe(2);
  expect(Object.values(result.state.explorationCharges)).toEqual([1, 1, 1, 1]);
});
```

- [ ] **Step 2: Write failing store and migration tests**

Assert new fields persist after a store action. Assert a legacy save receives default economy, modules, route effects, charges, and pending encounter while preserving compendium and progression.

- [ ] **Step 3: Run focused tests and confirm expected failures**

Run: `pnpm exec vitest run src/game/run.test.ts src/store/gameStore.test.ts src/store/gameStateMigration.test.ts`

- [ ] **Step 4: Implement reducer delegation, state projection, history updates, and migration**

Node movement must reject while an encounter is unresolved. Completing the floor exit exposes `advance-floor`; only the third-floor Boss can emit `run.ended` victory.

- [ ] **Step 5: Run store, migration, and complete unit suites**

Run: `pnpm test`

Expected: every Vitest file PASS with no unhandled errors.

- [ ] **Step 6: Commit and push**

```bash
git add src/game/run.ts src/game/run.test.ts src/store src/types/game.ts
git commit -m "feat: integrate three-floor runs into game state"
git push
```

### Task 6: Multi-type map UI and exploration controls

**Files:**
- Modify: `src/features/memory/RunMazePanel.tsx`
- Modify: `src/features/memory/RunMazePanel.test.tsx`
- Create: `src/features/memory/NodeIntelPanel.tsx`
- Create: `src/features/memory/NodeIntelPanel.test.tsx`
- Modify: `src/features/memory/MemoryPage.tsx`
- Modify: `src/features/memory/memory.css`

**Interfaces:**
- `RunMazePanel` receives `explorationCharges`, `scoutPoints`, `onUseExplorationPower`, and `onSpendScoutPoint`.
- `NodeIntelPanel` presents risk, revealed type, modifiers, reachable state, rewards, and exploration actions.

- [ ] **Step 1: Write failing rendering tests for all six labels and hidden information**

```tsx
expect(screen.getByRole('button', { name: /战斗.*可抵达/ })).toBeEnabled();
expect(screen.getByRole('button', { name: /未知.*风险 B/ })).toHaveTextContent('未知');
expect(screen.queryByText('奇境：倒流雨幕')).not.toBeInTheDocument();
```

- [ ] **Step 2: Write failing keyboard-action tests**

Select a reachable unknown node, activate “感知侦测”, verify its true type appears, and activate “进入节点” without pointer-only interaction.

- [ ] **Step 3: Run focused component tests and confirm they fail**

Run: `pnpm exec vitest run src/features/memory/RunMazePanel.test.tsx src/features/memory/NodeIntelPanel.test.tsx`

- [ ] **Step 4: Implement six icon-labelled variants, intel panel, graph/list parity, and responsive CSS**

Use Phosphor icons plus text labels. Use `resolveImageAsset` only for optional node illustration surfaces. Unknown nodes render their public type until `revealed` is true.

- [ ] **Step 5: Run memory component tests and accessibility tests**

Run: `pnpm exec vitest run src/features/memory src/test/accessibility.test.tsx`

- [ ] **Step 6: Commit and push**

```bash
git add src/features/memory
git commit -m "feat: expose strategic maze node choices"
git push
```

### Task 7: Encounter workbench and expanded Run status

**Files:**
- Create: `src/features/operation/EncounterPanel.tsx`
- Create: `src/features/operation/EncounterPanel.test.tsx`
- Create: `src/features/operation/ModuleInventory.tsx`
- Create: `src/features/operation/ModuleInventory.test.tsx`
- Modify: `src/features/operation/OperationPage.tsx`
- Modify: `src/features/operation/RunStatusBar.tsx`
- Modify: `src/features/operation/RunStatusBar.test.tsx`
- Modify: `src/features/operation/operation.css`
- Remove: `src/features/operation/NodeResolutionPanel.tsx`
- Remove: `src/features/operation/NodeResolutionPanel.test.tsx`

**Interfaces:**
- `EncounterPanel` consumes `PendingEncounter`, economy, fragments, modules, and local callbacks; it does not calculate outcomes.
- `ModuleInventory` renders catalog labels and active effects.

- [ ] **Step 1: Write failing interaction tests per encounter kind**

Render real domain fixtures and assert combat action, rest choice, shop purchase, wonder locked key, unknown reveal, and Boss phase controls call the correct store-facing callback with literal IDs.

- [ ] **Step 2: Write failing status-bar tests**

```tsx
expect(screen.getByText('层级 02 / 03')).toBeVisible();
expect(screen.getByText('残响 18')).toBeVisible();
expect(screen.getByText('侦测 2')).toBeVisible();
expect(screen.getByText('模块 3')).toBeVisible();
expect(screen.getByText('声音资源待填充')).toBeVisible();
```

- [ ] **Step 3: Run focused tests and confirm failures**

Run: `pnpm exec vitest run src/features/operation/EncounterPanel.test.tsx src/features/operation/RunStatusBar.test.tsx`

- [ ] **Step 4: Implement encounter dispatcher, module inventory, status, and responsive layout**

The primary CTA is the current valid settlement action. Locked choices remain visible with an explicit fragment/module requirement. Use asset-registry placeholders for encounter and module illustrations. Read `hasAudioAsset('mazeBgm')` and show the non-blocking “声音资源待填充” status until a real file is registered.

- [ ] **Step 5: Run operation and full unit tests**

Run: `pnpm exec vitest run src/features/operation && pnpm test`

Expected: operation tests and all unit tests PASS.

- [ ] **Step 6: Commit and push**

```bash
git add src/features/operation
git commit -m "feat: add node-specific encounter workbench"
git push
```

### Task 8: LLM narrative compatibility, end-to-end Run, and delivery audit

**Files:**
- Modify: `src/llm/gameContent.ts`
- Modify: `src/llm/gameContent.test.ts`
- Modify: `src/llm/gamePrompts.ts`
- Modify: `src/llm/gamePrompts.test.ts`
- Modify: `src/llm/localNovelBlueprint.ts`
- Modify: `src/llm/localNovelBlueprint.test.ts`
- Modify: `src/features/operation/LlmEventDirector.tsx`
- Modify: `src/features/operation/LlmEventDirector.test.tsx`
- Create: `e2e/integrated-run.spec.ts`
- Modify: `e2e/responsive.spec.ts`
- Modify: `docs/verification/2026-08-30-rosemary-memory-maze-refactor-audit.md`

**Interfaces:**
- Novel node briefs support all six public node types but cannot alter `hiddenType`.
- Wonder narration accepts only server-returned prose mapped to local choice IDs.
- E2E uses only user-visible controls and no direct store mutation.

- [ ] **Step 1: Write failing LLM contract tests**

Verify six node types parse, hidden outcome fields are rejected, numeric effects from the model are rejected, and local fallback prose exists for every type.

- [ ] **Step 2: Implement the six-type narrative allowlist and prompt authority boundary**

Prompts explicitly state that `nodeId`, public `nodeType`, option IDs, topology, rewards, prices, hidden outcomes, and numeric effects are read-only local data.

- [ ] **Step 3: Write a failing full-Run Playwright test**

Start preset mode, traverse three floors using visible reachable-node controls, complete at least one combat/rest/shop/wonder/unknown encounter, resolve the Boss, and assert the victory dialog plus core fragment.

- [ ] **Step 4: Implement only the UI wiring or deterministic fixture adjustments required by the E2E flow**

Do not add test-only production switches. Choose a fixed public seed whose deterministic map includes every required node.

- [ ] **Step 5: Run complete verification**

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm test:e2e
git diff --check
```

Expected: all commands exit 0; browser suite covers the complete three-floor Run and all responsive widths.

- [ ] **Step 6: Perform visual inspection**

Capture and inspect `/operation` and `/memory` at 1440×900, 1024×768, 768×1024, and 375×812 with combat, shop, unknown, and Boss panels visible. Confirm no clipped controls, broken images, inaccessible icon-only actions, or page-level horizontal overflow.

- [ ] **Step 7: Update verification evidence, commit, and push**

```bash
git add src/llm src/features/operation e2e docs/verification
git commit -m "feat: complete integrated memory maze prototype"
git push
```
