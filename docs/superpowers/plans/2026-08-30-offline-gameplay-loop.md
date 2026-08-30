# Offline Gameplay Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the replayable rules core into a complete keyboard-accessible offline Web roguelike loop on the existing operation and memory routes.

**Architecture:** Zustand remains a thin adapter over `src/game` pure rules. `/operation` becomes the primary play surface; `/memory` remains an equivalent expanded topology/list view. UI components dispatch typed Store actions and render structured `RuleEvent` data, never calculate combat, rewards, topology, or win/loss locally.

**Tech Stack:** React 19, TypeScript, Zustand, Vitest/Testing Library, Playwright, existing CSS tokens and Phosphor icons.

**Spec:** `docs/superpowers/specs/2026-08-29-rosemary-memory-maze-refactor-design.md`

## Global Constraints

- 迷迭香是唯一可操控、可养成和持续显示状态的人物。
- 离线预设模式必须在没有 API 和网络时完整可玩。
- 所有人物头像与立绘只使用 `/assets/characters/blank-character.svg` 和 `CharacterArtwork`。
- LLM 文本不得决定随机数、拓扑、难度、奖励或胜负。
- 所有动态控件必须有稳定、描述性的唯一 `id`。
- 拓扑必须提供键盘可完成的列表等价视图。
- reduced-motion 下故障与过渡动效必须完全停用。

---

### Task 1: Complete Store command surface

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`

**Interfaces:**
- Consumes: `reduceRunAction(state, action)` from `src/game/run.ts`.
- Produces: `completeCurrentNode(fragment?)`, `applyRunVitals(sanityDelta, overloadDelta)`, and `stabilizeMemoryCore()` Store actions.

- [x] **Step 1: Write failing adapter tests** proving a node reward can cause overflow, vitality damage can end a Run, and core stabilization records first clear.
- [x] **Step 2: Run `pnpm exec vitest run src/store/gameStore.test.ts`** and verify failures are missing actions.
- [x] **Step 3: Implement the three actions** by calling `reduceRunAction`; accepted resolutions update all roguelike slices, append `ruleLog`, and synchronize legacy Rosmontis display fields.
- [x] **Step 4: Re-run the focused tests and `pnpm typecheck`**; expect zero failures.
- [x] **Step 5: Commit** with `feat: expose offline run commands`.

### Task 2: Run HUD and replaceable portrait

**Files:**
- Create: `src/features/operation/RunStatusBar.tsx`
- Create: `src/features/operation/RunStatusBar.test.tsx`
- Modify: `src/features/operation/OperationPage.tsx`
- Modify: `src/features/operation/operation.css`

**Interfaces:**
- Consumes: `run`, `rosmontis`, `progression`, and `CharacterArtwork`.
- Produces: `RunStatusBar` with named meters and stable IDs.

- [x] **Step 1: Write a failing component test** expecting the blank portrait, Run mode/floor/turn, sanity, overload, AP, and explicit overload warning text at 70/85/100.
- [x] **Step 2: Verify RED** with `pnpm exec vitest run src/features/operation/RunStatusBar.test.tsx`.
- [x] **Step 3: Implement `RunStatusBar`** and insert it before the operation workbench; use `role="meter"` for both vitals and text labels for severity.
- [x] **Step 4: Verify GREEN, typecheck, and 375px no-overflow behavior** with focused Vitest and Playwright.
- [x] **Step 5: Commit** with `feat: add memory maze run HUD`.

### Task 3: Playable generated topology

**Files:**
- Create: `src/features/memory/RunMazePanel.tsx`
- Create: `src/features/memory/RunMazePanel.test.tsx`
- Modify: `src/features/memory/MemoryPage.tsx`
- Modify: `src/features/memory/memory.css`

**Interfaces:**
- Consumes: `MazeGraph`, `run.currentNodeId`, and `moveToNode(nodeId)`.
- Produces: SVG topology plus list view using the same node buttons and node-type labels.

- [ ] **Step 1: Write failing tests** for the four localized node labels, current/reachable/hidden states, disabled hidden nodes, and dispatching a reachable node ID.
- [ ] **Step 2: Verify RED** with the focused test.
- [ ] **Step 3: Implement graph/list rendering**; node IDs follow `run-maze-node-${node.id}` and edges never receive pointer events.
- [ ] **Step 4: Replace the legacy editable prototype topology** on `/memory` while retaining the accessible view switch.
- [ ] **Step 5: Verify focused tests, typecheck, and four viewport overflow checks**.
- [ ] **Step 6: Commit** with `feat: connect generated maze topology`.

### Task 4: Four tactical action cards

**Files:**
- Create: `src/features/operation/GreatswordActions.tsx`
- Create: `src/features/operation/GreatswordActions.test.tsx`
- Modify: `src/features/operation/OperationPage.tsx`
- Modify: `src/features/operation/operation.css`

**Interfaces:**
- Consumes: `GREATSWORD_CONFIG`, current node type, `rosmontis`, and `useGreatsword(action)`.
- Produces: four stable action cards for 破壁、守望、感知、共鸣.

- [ ] **Step 1: Write failing tests** for all four cards, AP/cooldown/overload copy, disabled illegal actions, and one successful Store dispatch.
- [ ] **Step 2: Verify RED**.
- [ ] **Step 3: Implement cards** with IDs `btn-greatsword-breach`, `btn-greatsword-watch`, `btn-greatsword-perception`, and `btn-greatsword-resonance`.
- [ ] **Step 4: Add status feedback** sourced from the newest `greatsword.used` RuleEvent; do not reproduce settlement constants in JSX.
- [ ] **Step 5: Verify GREEN and typecheck**.
- [ ] **Step 6: Commit** with `feat: add four offline tactical cards`.

### Task 5: Node settlement and fragment overflow modal

**Files:**
- Create: `src/features/operation/NodeResolutionPanel.tsx`
- Create: `src/features/operation/FragmentOverflowDialog.tsx`
- Create: `src/features/operation/NodeResolutionPanel.test.tsx`
- Modify: `src/features/operation/OperationPage.tsx`

**Interfaces:**
- Consumes: current node, `completeCurrentNode`, `memoryInventory`, and `resolveFragmentChoice`.
- Produces: deterministic node reward button and blocking discard/replace dialog.

- [ ] **Step 1: Write failing tests** proving reward collection, core-fragment separation, blocking overflow dialog, protected core fragments, discard, and replace.
- [ ] **Step 2: Verify RED**.
- [ ] **Step 3: Implement preset reward data keyed by node type and floor**, with stable fragment IDs derived from Run ID and node ID.
- [ ] **Step 4: Implement the non-dismissible choice flow**; Escape may not close an unresolved overflow, and every choice is keyboard accessible.
- [ ] **Step 5: Verify GREEN and typecheck**.
- [ ] **Step 6: Commit** with `feat: complete memory fragment choice flow`.

### Task 6: Run start, defeat, victory, and mode unlock

**Files:**
- Create: `src/features/operation/RunLifecycleDialog.tsx`
- Create: `src/features/operation/RunLifecycleDialog.test.tsx`
- Modify: `src/features/operation/OperationPage.tsx`
- Modify: `src/features/settings/SettingsPage.tsx`

**Interfaces:**
- Consumes: `getAvailableModes`, progression, LLM enabled state, `startRun`, `resetRun`, and `stabilizeMemoryCore`.
- Produces: seed/mode start controls and terminal victory/defeat dialogs.

- [ ] **Step 1: Write failing tests** for preset availability, locked endless, local endless after first clear, novel requiring LLM, victory summary, and restart.
- [ ] **Step 2: Verify RED**.
- [ ] **Step 3: Implement start controls and end dialogs**; seed input ID is `run-seed-input`, and mode controls explain lock reasons in text.
- [ ] **Step 4: Add a deterministic developer-safe core completion route through normal UI actions**, without direct state mutation or hidden debug controls.
- [ ] **Step 5: Verify GREEN, typecheck, and a Playwright preset-clear-to-endless flow**.
- [ ] **Step 6: Commit** with `feat: close the offline roguelike loop`.

### Task 7: Offline event pool and command mapping

**Files:**
- Create: `src/game/presetEvents.ts`
- Create: `src/game/presetEvents.test.ts`
- Modify: `src/features/operation/narrativeEngine.ts`
- Modify: `src/features/operation/OperationPage.test.tsx`

**Interfaces:**
- Consumes: Seeded random state, node type, vitals, fragments, and defined Run actions.
- Produces: preset event drafts with 2–3 choices and a command classifier that returns a defined action or recoverable suggestion.

- [ ] **Step 1: Write failing tests** for deterministic event selection, valid option counts, separation of text from numeric effects, recognized commands, and unknown-command recovery.
- [ ] **Step 2: Verify RED**.
- [ ] **Step 3: Implement the typed preset pool and command classifier** with no LLM calls and no `Math.random()`.
- [ ] **Step 4: Connect results to the terminal narrative flow** and use existing notifications for recovery guidance.
- [ ] **Step 5: Verify GREEN and typecheck**.
- [ ] **Step 6: Commit** with `feat: add deterministic offline events`.

### Task 8: Offline-loop quality gate

**Files:**
- Update this plan checkbox state and regressions proven by test failures.

- [ ] **Step 1: Run `pnpm test`**; expect zero failures.
- [ ] **Step 2: Run `pnpm typecheck` and `pnpm build`**; expect exit 0 and no large-chunk warning.
- [ ] **Step 3: Run `pnpm test:e2e`**; expect all routes, four viewports, modal focus rules, and the new complete offline flow to pass.
- [ ] **Step 4: Audit人物图片、旧多角色文案、占位文本、`Math.random()` and interactive IDs**; expect no violations.
- [ ] **Step 5: Run `git diff --check` and inspect `git status --short`**.
- [ ] **Step 6: Commit** with `feat: deliver playable offline memory maze`.

## Phase completion definition

- A player can start a preset Run, navigate a generated maze, use all four swords where legal, resolve nodes, collect/replace fragments, lose, stabilize the core, win, and unlock local endless without an API.
- Every人物 image remains the replaceable blank project asset.
- The same Seed reproduces topology, checks, rewards, and preset events.
- Mouse, touch, and keyboard flows work at 375, 768, 1024, and 1440 pixel widths.
