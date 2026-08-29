# Single-Protagonist Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the current multi-character terminal into a testable single-protagonist foundation and route every character portrait or illustration slot through one replaceable blank project asset.

**Architecture:** Keep the existing Zustand, Dexie, Tavern Runtime, routes, and design system. First make the default tactical state and visible navigation Rosmontis-only, then hide multi-character management while retaining the fixed internal Rosmontis prompt context. Introduce one shared character-art component so future resource replacement does not require component edits.

**Tech Stack:** React 19, TypeScript, Zustand, Dexie, Vitest, Testing Library, Playwright, CSS, SVG.

**Spec:** `docs/superpowers/specs/2026-08-29-rosemary-memory-maze-refactor-design.md`

## Global Constraints

- Rosmontis is the only controllable, persistent character.
- Memory echoes may appear in prose but never in the playable roster.
- Every character avatar, bust, or illustration slot renders `/assets/characters/blank-character.svg`.
- Imported remote avatar URLs and data URLs are never rendered by game UI.
- Keep the existing local/remote Tavern transport and storage data intact.
- Do not add a new global state framework or new runtime dependency.
- Preserve unique interactive IDs, keyboard access, reduced motion, responsive behavior, and Chinese functional copy.

---

### Task 1: Shared blank character artwork

**Files:**
- Create: `public/assets/characters/blank-character.svg`
- Create: `src/components/CharacterArtwork.tsx`
- Create: `src/components/CharacterArtwork.test.tsx`
- Modify: `src/components/components.css`

**Interfaces:**
- Produces: `CHARACTER_ARTWORK_SRC: '/assets/characters/blank-character.svg'`
- Produces: `CharacterArtwork(props: { kind: 'avatar' | 'portrait'; label: string; className?: string; decorative?: boolean }): JSX.Element`

- [x] **Step 1: Write the failing component test**

```tsx
import { render, screen } from '@testing-library/react';
import { CharacterArtwork, CHARACTER_ARTWORK_SRC } from './CharacterArtwork';

test('人物资源槽始终使用项目内空白图片', () => {
  render(<CharacterArtwork kind="portrait" label="迷迭香立绘" />);
  const image = screen.getByRole('img', { name: '迷迭香立绘' });
  expect(image).toHaveAttribute('src', CHARACTER_ARTWORK_SRC);
  expect(image).toHaveAttribute('data-artwork-kind', 'portrait');
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `pnpm test -- src/components/CharacterArtwork.test.tsx`

Expected: FAIL because `CharacterArtwork.tsx` does not exist.

- [x] **Step 3: Add the blank SVG and minimal component**

```tsx
export const CHARACTER_ARTWORK_SRC = '/assets/characters/blank-character.svg' as const;

export function CharacterArtwork({ kind, label, className = '', decorative = false }: CharacterArtworkProps) {
  return <img className={`character-artwork is-${kind} ${className}`.trim()} src={CHARACTER_ARTWORK_SRC} alt={decorative ? '' : label} aria-hidden={decorative || undefined} data-artwork-kind={kind} />;
}
```

The SVG must use a `640 960` viewBox, an opaque neutral terminal surface, and no human silhouette, text, logo, or copyrighted mark.

- [x] **Step 4: Add stable avatar and portrait aspect-ratio styles**

```css
.character-artwork { display:block; object-fit:cover; background:var(--color-surface-raised); }
.character-artwork.is-avatar { width:48px; aspect-ratio:1; }
.character-artwork.is-portrait { width:100%; aspect-ratio:2 / 3; }
```

- [x] **Step 5: Run the focused test and verify GREEN**

Run: `pnpm test -- src/components/CharacterArtwork.test.tsx`

Expected: 1 test passes.

- [x] **Step 6: Commit**

```bash
git add public/assets/characters/blank-character.svg src/components/CharacterArtwork.tsx src/components/CharacterArtwork.test.tsx src/components/components.css
git commit -m "feat: add replaceable blank character artwork"
```

### Task 2: Rosmontis-only default tactical data and persistence migration

**Files:**
- Create: `src/data/demoData.test.ts`
- Modify: `src/data/demoData.ts`
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`

**Interfaces:**
- Consumes: existing `Operator`, `OperatorsState`, and `buildDemoState()`.
- Produces: `sanitizeSingleProtagonistState(state: GameDataState): GameDataState`.
- Invariant: `Object.keys(state.operators.byId)` and `state.operators.squadOrder` contain only `rosmontis`.

- [x] **Step 1: Write failing default-state and migration tests**

```ts
test('默认战术状态只包含迷迭香', () => {
  const state = buildDemoState();
  expect(Object.keys(state.operators.byId)).toEqual(['rosmontis']);
  expect(state.operators.squadOrder).toEqual(['rosmontis']);
  expect(JSON.stringify(state)).not.toMatch(/阿米娅|末药|蛇屠箱/);
});

test('旧持久化状态载入时过滤其他干员', () => {
  const migrated = sanitizeSingleProtagonistState(legacyState);
  expect(Object.keys(migrated.operators.byId)).toEqual(['rosmontis']);
});
```

- [x] **Step 2: Run focused tests and verify RED**

Run: `pnpm test -- src/data/demoData.test.ts src/store/gameStore.test.ts`

Expected: FAIL because legacy squad members remain and `sanitizeSingleProtagonistState` is missing.

- [x] **Step 3: Remove secondary operators and rewrite user-facing demo copy**

Delete the `squad` fixture. Build `operators.byId` from Rosmontis only, set `squadOrder` to `['rosmontis']`, and set formation copy to `单人认知潜入`. Replace other-character discoverers and actors with `迷迭香`, `指挥者`, or `系统` according to the event source. Replace “小队” commands with Rosmontis-only instructions.

- [x] **Step 4: Add migration sanitization to Zustand persistence**

```ts
export function sanitizeSingleProtagonistState(state: GameDataState): GameDataState {
  const rosmontis = state.operators.byId.rosmontis ?? buildDemoState().operators.byId.rosmontis;
  return {
    ...state,
    operators: { byId: { rosmontis }, squadOrder: ['rosmontis'], formation: '单人认知潜入' },
  };
}
```

Apply it from the persist middleware `merge` option so old local storage is sanitized without touching Dexie.

- [x] **Step 5: Run focused tests and verify GREEN**

Run: `pnpm test -- src/data/demoData.test.ts src/store/gameStore.test.ts`

Expected: all focused tests pass.

- [x] **Step 6: Commit**

```bash
git add src/data/demoData.ts src/data/demoData.test.ts src/store/gameStore.ts src/store/gameStore.test.ts
git commit -m "refactor: migrate tactical state to Rosmontis only"
```

### Task 3: Rosmontis-only status page with portrait slot

**Files:**
- Modify: `src/features/operators/OperatorsPage.tsx`
- Modify: `src/features/operators/RosmontisProfile.tsx`
- Modify: `src/features/operators/operators.css`
- Modify: `src/features/operators/OperatorsPage.test.tsx`

**Interfaces:**
- Consumes: `CharacterArtwork` from Task 1 and `selectRosmontis`.
- Produces: a status page titled `迷迭香状态` with no roster, role manager, or secondary dossier interaction.

- [x] **Step 1: Replace the page tests with Rosmontis-only assertions**

```tsx
test('只显示迷迭香状态和空白立绘', async () => {
  renderApp('/operators');
  expect(await screen.findByRole('heading', { level: 1, name: '迷迭香状态' })).toBeVisible();
  expect(screen.getByRole('img', { name: '迷迭香立绘占位' })).toHaveAttribute('src', '/assets/characters/blank-character.svg');
  expect(screen.queryByText('随行小队')).not.toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: '角色与身份' })).not.toBeInTheDocument();
});
```

- [x] **Step 2: Run the page test and verify RED**

Run: `pnpm test -- src/features/operators/OperatorsPage.test.tsx`

Expected: FAIL because the page still renders squad and character management.

- [x] **Step 3: Simplify the page and insert the portrait component**

`OperatorsPage` reads only `state.operators.byId.rosmontis`, renders one `RosmontisProfile`, and removes `SquadRoster`, `OperatorDialog`, tabs, and `CharacterManager`. `RosmontisProfile` renders `CharacterArtwork kind="portrait" label="迷迭香立绘占位"` in its identity section.

- [x] **Step 4: Update layout styles**

Use a bounded portrait column on desktop and a compact 3:2 banner crop on mobile. Do not hide the image with CSS; the blank slot must remain visible so resource placement can be reviewed.

- [x] **Step 5: Run the page test and verify GREEN**

Run: `pnpm test -- src/features/operators/OperatorsPage.test.tsx`

Expected: Rosmontis status tests pass and no secondary character controls are found.

- [x] **Step 6: Commit**

```bash
git add src/features/operators/OperatorsPage.tsx src/features/operators/RosmontisProfile.tsx src/features/operators/operators.css src/features/operators/OperatorsPage.test.tsx
git commit -m "refactor: focus status page on Rosmontis"
```

### Task 4: Single-protagonist navigation and operation overview

**Files:**
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/AppShell.test.tsx`
- Modify: `src/features/operation/OperationPage.tsx`
- Modify: `src/features/operation/TacticalOverview.tsx`
- Modify: `src/features/operation/operation.css`
- Modify: `src/features/operation/OperationPage.test.tsx`
- Modify: `src/features/memory/MemoryPage.tsx`
- Modify: `src/features/memory/MemoryInspector.tsx`
- Modify: `src/features/memory/ExpansionDialog.tsx`
- Modify: `src/features/settings/ResetDemoDialog.tsx`
- Create: `src/test/singleProtagonistContract.test.ts`

**Interfaces:**
- Consumes: Rosmontis-only `squadOrder` invariant from Task 2.
- Produces: navigation label `迷迭香状态` and operation/memory copy that addresses Rosmontis rather than a squad.

- [x] **Step 1: Add failing navigation and content assertions**

```tsx
expect(screen.getByRole('link', { name: /迷迭香状态/ })).toBeVisible();
expect(document.body).not.toHaveTextContent(/干员与小队|随行小队|小队链路/);
```

Add a source contract that the listed runtime files contain none of `阿米娅|末药|蛇屠箱`.

- [x] **Step 2: Run focused tests and verify RED**

Run: `pnpm test -- src/app/AppShell.test.tsx src/features/operation/OperationPage.test.tsx`

Expected: FAIL on old navigation and squad copy.

- [x] **Step 3: Rewrite navigation and operation content**

Rename the nav item while preserving `/operators` for deep-link compatibility. Pass Rosmontis directly to `TacticalOverview`; replace the multi-operator action sequence with a single-protagonist action resource panel. Rewrite “小队” movement, high-risk, reset, and expansion copy to address `迷迭香` or `当前 Run`.

- [x] **Step 4: Run focused tests and verify GREEN**

Run: `pnpm test -- src/app/AppShell.test.tsx src/features/operation/OperationPage.test.tsx src/features/memory/MemoryPage.test.tsx`

Expected: all focused tests pass.

- [x] **Step 5: Commit**

```bash
git add src/app/AppShell.tsx src/app/AppShell.test.tsx src/features/operation src/features/memory src/features/settings/ResetDemoDialog.tsx
git commit -m "refactor: align terminal copy with single protagonist"
```

### Task 5: Hide character management and force blank thumbnails

**Files:**
- Modify: `src/features/tavern/components/TavernEntityTabs.tsx`
- Modify: `src/features/tavern/components/TavernOrchestrator.tsx`
- Modify: `src/features/tavern/components/TavernOrchestrator.test.tsx`
- Modify: `src/features/tavern/characters/CharacterManager.tsx`
- Modify: `src/features/tavern/entities.test.tsx`

**Interfaces:**
- Consumes: fixed internal Rosmontis character from existing Tavern settings.
- Consumes: `CharacterArtwork` from Task 1.
- Produces: `TavernTab = 'sessions' | 'lorebooks' | 'presets' | 'variables'`.

- [ ] **Step 1: Write failing orchestrator and thumbnail tests**

```tsx
expect(within(dialog).queryByRole('tab', { name: /^角色 / })).not.toBeInTheDocument();
expect(screen.getByRole('img', { name: /角色卡缩略图/ })).toHaveAttribute('src', '/assets/characters/blank-character.svg');
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm test -- src/features/tavern/components/TavernOrchestrator.test.tsx src/features/tavern/entities.test.tsx`

Expected: FAIL because the character tab remains and imported avatars can be rendered.

- [ ] **Step 3: Remove the character tab from the orchestrator**

Remove `characters` from `TavernTab`, counts, tab configuration, and conditional panel rendering. Do not delete character records or Dexie tables; the fixed active Rosmontis card remains an internal generation dependency.

- [ ] **Step 4: Force any retained character thumbnail through CharacterArtwork**

Replace `character.avatar ? <img ...> : ...` in `CharacterManager` with `CharacterArtwork kind="avatar" label={`${character.name}角色卡缩略图`}`. This protects any future administrative re-entry from displaying remote or copyrighted images.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `pnpm test -- src/features/tavern/components/TavernOrchestrator.test.tsx src/features/tavern/entities.test.tsx`

Expected: all focused tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/tavern/components src/features/tavern/characters/CharacterManager.tsx src/features/tavern/entities.test.tsx
git commit -m "refactor: hide multi-character management"
```

### Task 6: Full regression and browser verification

**Files:**
- Modify as required by verified regressions only.
- Update: `docs/superpowers/plans/2026-08-29-single-protagonist-foundation.md` checkbox state.

**Interfaces:**
- Verifies all deliverables from Tasks 1–5.

- [ ] **Step 1: Run source audits**

Run: `rg -n "阿米娅|末药|蛇屠箱|干员与小队|随行小队" src --glob '!**/*.test.*'`

Expected: no user-visible runtime matches. Legacy unreachable files may only remain if explicitly documented and excluded from the build.

- [ ] **Step 2: Run unit and component tests**

Run: `pnpm test`

Expected: all test files and tests pass with zero failures.

- [ ] **Step 3: Run type and production checks**

Run: `pnpm typecheck`

Expected: exit code 0.

Run: `pnpm build`

Expected: exit code 0 and no Vite large-chunk warning.

- [ ] **Step 4: Run the Playwright suite**

Run: `pnpm test:e2e`

Expected: all Chromium tests pass at 375, 768, 1024, and 1440 widths.

- [ ] **Step 5: Verify worktree and commit the phase**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only intentional phase files are present.

```bash
git add docs src public
git commit -m "feat: establish Rosmontis-only game foundation"
```
