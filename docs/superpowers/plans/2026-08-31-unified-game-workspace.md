# Unified Game Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one continuous “迷迭香的记忆迷宫” game workspace with top navigation, a dynamic SVG maze, scene-based node entry, focused support pages, V8 save migration, and no legacy archive or tactical-timeline data path.

**Architecture:** Add a focused `features/game` package whose pure scene reducer and deterministic layout module sit between the authoritative Zustand Run state and the React presentation. Introduce new top-level pages and routes before removing their legacy counterparts, then delete the obsolete `memoryMap`, `archive`, and `actionLog` domains only after all consumers have moved. Keep all game-rule mutations in existing Store Actions; animation state remains ephemeral and can never become a second source of truth.

**Tech Stack:** React 19, TypeScript 7, Zustand 5, React Router 7, Lucide React, CSS/SVG, Vitest, Testing Library, Playwright, Vite.

**Spec:** `docs/superpowers/specs/2026-08-31-unified-game-workspace-design.md`

## Global Constraints

- The visible product name is exactly `迷迭香的记忆迷宫`.
- The fixed top menu labels are exactly `游戏`、`记忆图鉴`、`迷迭香手记`、`行动记录`、`系统设置`.
- The only gameplay route is `/game`; `/operation`、`/memory`、`/operators` redirect to it.
- Do not change game balance, five-floor rules, eight node types, Boss phases, LLM schemas, or local fallback behavior.
- Do not add Canvas, WebGL, Three.js, or an animation dependency; use React, CSS, and SVG only.
- Keep portrait, artwork, background, music, and audio references behind the existing `assets` registry and blank placeholders.
- All game-rule mutations continue through existing Store Actions; presentation animations never calculate rewards or damage.
- Standard node entry lasts 650–850ms; reduced motion uses a crossfade of no more than 120ms.
- Interactive targets are at least 44×44px, keyboard reachable, visibly focused, and not distinguished by color alone.
- Zustand persistence advances from version 7 to version 8; Tavern IndexedDB remains version 5.
- Preserve the existing localStorage key for migration compatibility and preserve Tavern characters, personas, lorebooks, presets, chats, messages, settings, and diary entries.
- Use Lucide icons only; no Emoji may be used as a structural icon.
- Each task starts with a failing test, ends with its focused tests plus `npm run typecheck`, and is committed and pushed to `origin/codex/rosemary-memory-maze`.

---

## File Structure

### New focused modules

- `src/features/game/sceneState.ts` — ephemeral scene reducer and transition guards.
- `src/features/game/sceneState.test.ts` — reducer transition, cancellation, stale-token, and restore tests.
- `src/features/game/mazeLayout.ts` — deterministic node positions and SVG Bezier paths.
- `src/features/game/mazeLayout.test.ts` — stable layout, bounds, spacing, and path tests.
- `src/features/game/GamePage.tsx` — single `/game` route composition and Store wiring.
- `src/features/game/GamePage.test.tsx` — integrated game-route behavior.
- `src/features/game/GameHud.tsx` — persistent character and Run telemetry.
- `src/features/game/RosmontisPresence.tsx` — quote and companion controls.
- `src/features/game/MazeStage.tsx` — graph, list alternative, camera controls, and direct node-entry request.
- `src/features/game/MazeStage.test.tsx` — node semantics, controls, keyboard, and direct-entry tests.
- `src/features/game/NodeScene.tsx` — current encounter, tactical cards, narrative, rewards, and return control.
- `src/features/game/NodeTransitionLayer.tsx` — theme-specific visual layer driven only by scene state.
- `src/features/game/game.css` — game-workspace, map, node scene, transition, responsive, and reduced-motion rules.
- `src/features/compendium/CompendiumPage.tsx` — permanent memory collection only.
- `src/features/compendium/CompendiumPage.test.tsx` — collection and legacy-content absence tests.
- `src/features/diary/DiaryPage.tsx` — route wrapper around `DiaryPanel`.
- `src/features/records/RecordsPage.tsx` — Run history and current rule log only.
- `src/features/records/RecordsPage.test.tsx` — record content and timeline absence tests.
- `src/features/records/formatRuleEvent.ts` — user-readable RuleEvent projection.
- `src/features/records/formatRuleEvent.test.ts` — exhaustive formatter tests.
- `src/test/legacyRemovalContract.test.ts` — production-source ban on removed modules and titles.
- `e2e/unified-game-workspace.spec.ts` — routing, node entry, return, refresh, mobile, and reduced-motion coverage.

### Principal modified modules

- `index.html`, `package.json` — visible metadata and package name.
- `src/app/AppShell.tsx`, `src/app/app-shell.css`, `src/app/router.tsx` — single-column shell, top menu, and new routes.
- `src/features/settings/SettingsPage.tsx`, `src/features/settings/settings.css` — content materials and session management tabs.
- `src/types/game.ts` — remove legacy types; add `UiState.mazeViewMode`.
- `src/data/demoData.ts` — keep current roguelike and single protagonist, remove old narrative/map/archive/log fixtures.
- `src/store/gameStore.ts`, `src/store/gameStateMigration.ts`, `src/store/selectors.ts` — V8 persistence and removal of old actions/projections.
- `src/features/tavern/projection/tavern-turn-projector.ts` — project only retained session and Rosmontis fields.
- `src/features/tavern/runtime/TavernProvider.tsx` — continue applying retained projection events without legacy materialization.
- `src/features/settings/ResetDemoDialog.tsx` — accurate reset copy.
- `src/styles/responsive.css`, `src/styles/global.css` — remove sidebar assumptions and enforce mobile behavior.
- Cross-cutting tests in `src/app`, `src/test`, `e2e` — update routes, labels, IDs, and expectations.

### Deleted legacy modules after migration

- `src/features/operation/OperationPage.tsx`, `src/features/operation/TacticalOverview.tsx`, `src/features/operation/NarrativeStream.tsx`, `src/features/operation/narrativeEngine.ts` and tests that only cover them.
- `src/features/memory/MemoryPage.tsx`, `MemoryGraph.tsx`, `MemoryList.tsx`, `MemoryInspector.tsx`, `ExpansionDialog.tsx`, `NodeIntelPanel.tsx`, `RunMazePanel.tsx`, and obsolete tests.
- Delete the complete `src/features/operators` route feature after `GameHud` is active; `CharacterArtwork` remains in `src/components` and is the only portrait primitive needed by the game HUD.
- `src/features/archive/ArchivePage.tsx`, `ArchiveFilters.tsx`, `ArchiveGrid.tsx`, `ArchiveDialog.tsx`, `ArchiveRelationGraph.tsx`, `ReasoningBoard.tsx`, their tests, and archive-only CSS.
- `src/features/log/LogPage.tsx`, `ActionTimeline.tsx`, `ReplayDialog.tsx`, and their tests; retain `SessionBranchTree` only if settings still imports it.

---

### Task 1: Add the Pure Scene State Machine

**Files:**
- Create: `src/features/game/sceneState.ts`
- Create: `src/features/game/sceneState.test.ts`

**Interfaces:**
- Consumes: `{ nodeId: string; resolved: boolean } | null` as the minimal authoritative encounter snapshot used for restore.
- Produces: `GameSceneState`, `GameSceneAction`, `createGameSceneState()`, `restoreGameSceneState()`, `gameSceneReducer()`.

- [ ] **Step 1: Write reducer tests that define legal transitions**

```ts
import { createGameSceneState, gameSceneReducer } from './sceneState';

test('commits only the current node transition and ignores stale timers', () => {
  const initial = createGameSceneState();
  const entering = gameSceneReducer(initial, { type: 'request-node', nodeId: 'node-a' });
  const replaced = gameSceneReducer(entering, { type: 'request-node', nodeId: 'node-b' });

  expect(gameSceneReducer(replaced, { type: 'commit-node', transitionId: entering.transitionId }))
    .toEqual(replaced);
  expect(gameSceneReducer(replaced, { type: 'commit-node', transitionId: replaced.transitionId }))
    .toMatchObject({ phase: 'entering-node', targetNodeId: 'node-b', commitState: 'committed' });
});

test('can cancel only before the movement commit', () => {
  const entering = gameSceneReducer(createGameSceneState(), { type: 'request-node', nodeId: 'node-a' });
  expect(gameSceneReducer(entering, { type: 'cancel-entry' }).phase).toBe('map');
  const committed = gameSceneReducer(entering, { type: 'commit-node', transitionId: entering.transitionId });
  expect(gameSceneReducer(committed, { type: 'cancel-entry' })).toEqual(committed);
});
```

- [ ] **Step 2: Run the reducer test and confirm the module is missing**

Run: `npm test -- src/features/game/sceneState.test.ts`

Expected: FAIL because `./sceneState` does not exist.

- [ ] **Step 3: Implement the explicit reducer**

```ts
export type GameScenePhase = 'map' | 'entering-node' | 'node' | 'settling-node' | 'returning-map';
export interface GameSceneState {
  phase: GameScenePhase;
  targetNodeId: string | null;
  transitionId: number;
  commitState: 'preview' | 'committed';
  camera: { x: number; y: number; scale: number };
}
export type GameSceneAction =
  | { type: 'request-node'; nodeId: string }
  | { type: 'commit-node'; transitionId: number }
  | { type: 'open-node'; nodeId: string }
  | { type: 'settle-node' }
  | { type: 'request-map' }
  | { type: 'finish-return' }
  | { type: 'cancel-entry' }
  | { type: 'set-camera'; camera: GameSceneState['camera'] };

export const createGameSceneState = (): GameSceneState => ({
  phase: 'map', targetNodeId: null, transitionId: 0, commitState: 'preview',
  camera: { x: 0, y: 0, scale: 1 },
});

export function gameSceneReducer(state: GameSceneState, action: GameSceneAction): GameSceneState {
  if (action.type === 'request-node') return { ...state, phase: 'entering-node', targetNodeId: action.nodeId, transitionId: state.transitionId + 1, commitState: 'preview' };
  if (action.type === 'commit-node') return action.transitionId === state.transitionId && state.phase === 'entering-node' ? { ...state, commitState: 'committed' } : state;
  if (action.type === 'cancel-entry') return state.phase === 'entering-node' && state.commitState === 'preview' ? { ...state, phase: 'map', targetNodeId: null } : state;
  if (action.type === 'open-node') return { ...state, phase: 'node', targetNodeId: action.nodeId, commitState: 'committed' };
  if (action.type === 'settle-node') return { ...state, phase: 'settling-node' };
  if (action.type === 'request-map') return { ...state, phase: 'returning-map' };
  if (action.type === 'finish-return') return { ...state, phase: 'map', targetNodeId: null, commitState: 'preview' };
  if (action.type === 'set-camera') return { ...state, camera: action.camera };
  return state;
}
```

- [ ] **Step 4: Add restore tests and implementation**

```ts
test('restores an unresolved encounter inside the node and a resolved run on the map', () => {
  expect(restoreGameSceneState({ nodeId: 'node-a', resolved: false }).phase).toBe('node');
  expect(restoreGameSceneState({ nodeId: 'node-a', resolved: true }).phase).toBe('map');
  expect(restoreGameSceneState(null).phase).toBe('map');
});
```

Implement `restoreGameSceneState(encounter)` by returning `open-node` state only when `encounter && !encounter.resolved`.

```ts
export function restoreGameSceneState(encounter: { nodeId: string; resolved: boolean } | null): GameSceneState {
  const state = createGameSceneState();
  return encounter && !encounter.resolved
    ? gameSceneReducer(state, { type: 'open-node', nodeId: encounter.nodeId })
    : state;
}
```

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/features/game/sceneState.test.ts && npm run typecheck`

```bash
git add src/features/game/sceneState.ts src/features/game/sceneState.test.ts
git commit -m "feat: add game scene state machine"
git push origin codex/rosemary-memory-maze
```

---

### Task 2: Add Deterministic Maze Layout and SVG Paths

**Files:**
- Create: `src/features/game/mazeLayout.ts`
- Create: `src/features/game/mazeLayout.test.ts`

**Interfaces:**
- Consumes: `MazeNode[]`, `MazeEdge[]` from `src/game/types.ts`.
- Produces: `MazePoint`, `buildMazeLayout(nodes)`, `buildMazePath(source, target)`.

- [ ] **Step 1: Write layout invariants**

```ts
test('keeps every node inside the stage and separates nodes in the same depth', () => {
  const points = buildMazeLayout(maze.nodes);
  expect([...points.values()].every(({ x, y }) => x >= 8 && x <= 92 && y >= 12 && y <= 88)).toBe(true);
  const depthOne = maze.nodes.filter((node) => node.depth === 1).map((node) => points.get(node.id)!);
  expect(Math.abs(depthOne[0].y - depthOne[1].y)).toBeGreaterThanOrEqual(18);
});

test('returns the same positions and curved path for the same topology', () => {
  expect(buildMazeLayout(maze.nodes)).toEqual(buildMazeLayout(maze.nodes));
  expect(buildMazePath({ x: 10, y: 20 }, { x: 60, y: 70 })).toBe('M 10 20 C 35 20, 35 70, 60 70');
});
```

- [ ] **Step 2: Run and confirm the missing-module failure**

Run: `npm test -- src/features/game/mazeLayout.test.ts`

Expected: FAIL because `mazeLayout.ts` does not exist.

- [ ] **Step 3: Implement depth-group layout and Bezier output**

```ts
export interface MazePoint { x: number; y: number }

export function buildMazeLayout(nodes: readonly MazeNode[]) {
  const result = new Map<string, MazePoint>();
  const maxDepth = Math.max(1, ...nodes.map((node) => node.depth));
  const groups = new Map<number, MazeNode[]>();
  for (const node of nodes) groups.set(node.depth, [...(groups.get(node.depth) ?? []), node]);
  for (const [depth, group] of groups) {
    group.forEach((node, index) => {
      const y = group.length === 1 ? 50 : 12 + (index * 76) / (group.length - 1);
      result.set(node.id, { x: 8 + (depth * 84) / maxDepth, y });
    });
  }
  return result;
}

export function buildMazePath(source: MazePoint, target: MazePoint) {
  const middle = (source.x + target.x) / 2;
  return `M ${source.x} ${source.y} C ${middle} ${source.y}, ${middle} ${target.y}, ${target.x} ${target.y}`;
}
```

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/features/game/mazeLayout.test.ts && npm run typecheck`

```bash
git add src/features/game/mazeLayout.ts src/features/game/mazeLayout.test.ts
git commit -m "feat: add deterministic maze presentation layout"
git push origin codex/rosemary-memory-maze
```

---

### Task 3: Split Memory Collection, Diary, and Records Pages

**Files:**
- Create: `src/features/compendium/CompendiumPage.tsx`
- Create: `src/features/compendium/CompendiumPage.test.tsx`
- Create: `src/features/diary/DiaryPage.tsx`
- Create: `src/features/records/formatRuleEvent.ts`
- Create: `src/features/records/formatRuleEvent.test.ts`
- Create: `src/features/records/RecordsPage.tsx`
- Create: `src/features/records/RecordsPage.test.tsx`
- Modify: `src/features/archive/ArchivePage.tsx` only to export or move the current `MemoryCompendium` markup before the old file is deleted.
- Modify: `src/features/log/LogPage.tsx` only to move the current Run history markup before the old file is deleted.

**Interfaces:**
- Consumes: `memoryCompendium`, `runHistory`, `ruleLog`, and existing `DiaryPanel`.
- Produces: default route components `CompendiumPage`, `DiaryPage`, `RecordsPage`; `formatRuleEvent(event, index): ReadableRuleEvent`.

- [ ] **Step 1: Write route-component tests that reject legacy content**

```tsx
test('memory collection contains only permanent memories', async () => {
  renderApp('/compendium');
  expect(await screen.findByRole('heading', { name: '记忆图鉴' })).toBeVisible();
  expect(screen.queryByRole('tab', { name: '叙事档案' })).not.toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: '关系图' })).not.toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: '推理台' })).not.toBeInTheDocument();
});

test('records expose Run history and formatted current rules only', async () => {
  renderApp('/records');
  expect(await screen.findByRole('region', { name: 'Run 历史' })).toBeVisible();
  expect(screen.getByRole('region', { name: '当前局记录' })).toBeVisible();
  expect(screen.queryByRole('tab', { name: '战术时间线' })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run and confirm the routes are not found**

Run: `npm test -- src/features/compendium/CompendiumPage.test.tsx src/features/records/RecordsPage.test.tsx`

Expected: FAIL because the new pages and routes are absent.

- [ ] **Step 3: Define an exhaustive readable rule formatter**

```ts
export interface ReadableRuleEvent { id: string; title: string; detail: string }

export function formatRuleEvent(event: RuleEvent, index: number): ReadableRuleEvent {
  const id = `rule-event-${index + 1}`;
  switch (event.type) {
    case 'check.resolved': return { id, title: 'D20 检定完成', detail: `结果 ${event.total}，难度 ${event.difficulty}` };
    case 'greatsword.used': return { id, title: `${GREATSWORD_NAMES[event.swordId]}已执行`, detail: `消耗 ${event.actionPointCost} 行动点，过载变化 ${event.overloadDelta}` };
    case 'fragment.acquired': return { id, title: '取得记忆碎片', detail: event.fragmentId };
    case 'fragment.overflow': return { id, title: '记忆槽位已满', detail: event.fragmentId };
    case 'fragment.discarded': return { id, title: '放弃记忆碎片', detail: event.fragmentId };
    case 'fragment.replaced': return { id, title: '替换记忆碎片', detail: `${event.forgottenFragmentId} → ${event.acquiredFragmentId}` };
    case 'fragment.transcribed': return { id, title: '记忆已抄录至手记', detail: event.fragmentId };
    case 'run.moved': return { id, title: '进入新的迷宫节点', detail: `${event.sourceNodeId} → ${event.targetNodeId}` };
    case 'node.completed': return { id, title: '节点结算完成', detail: event.nodeId };
    case 'encounter.action-resolved': return { id, title: '遭遇行动已结算', detail: `${event.nodeId} · ${event.actionType}` };
    case 'comfort.used': return { id, title: '陪伴交互已完成', detail: `消耗 ${event.actionPointCost} 行动点，过载变化 ${event.overloadDelta}` };
    case 'economy.echoes-changed': return { id, title: '记忆残响已变更', detail: `${event.delta >= 0 ? '+' : ''}${event.delta}，当前 ${event.balance}` };
    case 'module.acquired': return { id, title: '认知模块已装载', detail: event.moduleId };
    case 'fragment.sold': return { id, title: '记忆碎片已出售', detail: `${event.fragmentId}，获得 ${event.echoes} 残响` };
    case 'run.ended': return { id, title: event.result === 'victory' ? '成功逃离' : '认知链路中断', detail: event.result };
    default: return assertNever(event);
  }
}

function assertNever(value: never): never { throw new Error(`未支持的规则事件：${JSON.stringify(value)}`); }
```

Write one table-driven assertion for every current `RuleEvent['type']`; do not use `JSON.stringify` in the user-facing output.

- [ ] **Step 4: Implement focused pages**

```tsx
export default function DiaryPage() {
  return <section className="route-page diary-route" aria-labelledby="diary-page-title"><PageHeader id="diary-page-title" code="03" title="迷迭香手记" description="查看迷迭香留下的手记并添加博士批注。" meta="LOCAL DIARY / INDEXEDDB" /><DiaryPanel /></section>;
}
```

`CompendiumPage` reads only `state.memoryCompendium`. `RecordsPage` renders `runHistory` in reverse chronological order and `ruleLog.map(formatRuleEvent)` under a region named `当前局记录`.

- [ ] **Step 5: Add temporary test-only routes, verify, and commit**

Add `/compendium`, `/diary`, and `/records` to `src/app/router.tsx`; old routes remain until Task 6.

Run: `npm test -- src/features/compendium/CompendiumPage.test.tsx src/features/records/formatRuleEvent.test.ts src/features/records/RecordsPage.test.tsx && npm run typecheck`

```bash
git add src/features/compendium src/features/diary/DiaryPage.tsx src/features/records src/app/router.tsx
git commit -m "feat: split collection diary and records pages"
git push origin codex/rosemary-memory-maze
```

---

### Task 4: Move Content Materials and Sessions into Settings

**Files:**
- Modify: `src/features/settings/SettingsPage.tsx`
- Modify: `src/features/settings/SettingsPage.test.tsx`
- Modify: `src/features/settings/settings.css`
- Reuse: `src/features/tavern/lorebooks/LorebookManager.tsx`
- Reuse: `src/features/tavern/characters/CharacterManager.tsx`
- Reuse: `src/features/tavern/components/SessionManager.tsx`
- Reuse: `src/features/log/SessionBranchTree.tsx`

**Interfaces:**
- Consumes: existing manager components and Tavern runtime.
- Produces: settings workspaces `content` and `sessions` reachable through `settings-tabs`.

- [ ] **Step 1: Extend the settings test**

```tsx
test('hosts worldbooks characters and sessions inside system settings', async () => {
  const user = userEvent.setup();
  renderApp('/settings');
  await user.click(await screen.findByRole('tab', { name: '内容资料' }));
  expect(await screen.findByRole('heading', { name: '世界书索引' })).toBeVisible();
  expect(screen.getByRole('heading', { name: '角色与身份' })).toBeVisible();
  await user.click(screen.getByRole('tab', { name: '会话管理' }));
  expect(await screen.findByRole('heading', { name: '会话调度' })).toBeVisible();
  expect(screen.getByRole('tree', { name: '酒馆会话分支' })).toBeVisible();
});
```

- [ ] **Step 2: Run and verify that the two tabs are absent**

Run: `npm test -- src/features/settings/SettingsPage.test.tsx`

Expected: FAIL because `内容资料` and `会话管理` do not exist.

- [ ] **Step 3: Add typed tab values and panels**

```ts
type SettingsWorkspace = 'connection' | 'generation' | 'parsing' | 'data' | 'visual' | 'content' | 'sessions';
```

Render `LorebookManager` and `CharacterManager` in `settings-panel-content`. Render `SessionManager` and `SessionBranchTree` in `settings-panel-sessions`. Keep the existing seven-panel single-selection behavior and do not wrap the managers in the old Tavern orchestrator dialog.

```tsx
{workspace === 'content' ? (
  <section id="settings-panel-content" className="settings-workspace" role="tabpanel" aria-labelledby="settings-tabs-content">
    <LorebookManager />
    <CharacterManager />
  </section>
) : null}
{workspace === 'sessions' ? (
  <section id="settings-panel-sessions" className="settings-workspace" role="tabpanel" aria-labelledby="settings-tabs-sessions">
    <SessionManager />
    <SessionBranchTree />
  </section>
) : null}
```

- [ ] **Step 4: Add settings-layout CSS and verify**

Use a normal page grid with one scroll owner; manager content must wrap at 767px without a fixed internal sidebar.

Run: `npm test -- src/features/settings/SettingsPage.test.tsx && npm run typecheck`

- [ ] **Step 5: Commit and push**

```bash
git add src/features/settings/SettingsPage.tsx src/features/settings/SettingsPage.test.tsx src/features/settings/settings.css
git commit -m "feat: move content and session management into settings"
git push origin codex/rosemary-memory-maze
```

---

### Task 5: Compose the Unified Game Page

**Files:**
- Create: `src/features/game/GameHud.tsx`
- Create: `src/features/game/RosmontisPresence.tsx`
- Create: `src/features/game/NodeScene.tsx`
- Create: `src/features/game/GamePage.tsx`
- Create: `src/features/game/GamePage.test.tsx`
- Create: `src/features/game/game.css`
- Reuse: `src/features/operation/RunStatusBar.tsx`, `RosmontisQuotePanel.tsx`, `CompanionInteractionBar.tsx`, `GreatswordActions.tsx`, `EncounterPanel.tsx`, `ModuleInventory.tsx`, `LlmEventDirector.tsx`, `NovelRunDirector.tsx`, `RunLifecycleDialog.tsx`, `FragmentOverflowDialog.tsx`
- Reuse initially: `src/features/memory/RunMazePanel.tsx`

**Interfaces:**
- Consumes: existing game Store Actions and `GameSceneState` from Task 1.
- Produces: default `GamePage`, `GameHud`, `RosmontisPresence`, `NodeScene`.

- [ ] **Step 1: Write the unified-page contract**

```tsx
test('shows map character state and node actions on the same route', async () => {
  renderApp('/game');
  expect(await screen.findByRole('heading', { name: '迷迭香的记忆迷宫' })).toBeVisible();
  expect(screen.getByLabelText('迷迭香 Run 状态')).toBeVisible();
  expect(screen.getByRole('region', { name: '记忆迷宫' })).toBeVisible();
  expect(screen.getByRole('region', { name: '迷迭香陪伴交互' })).toBeVisible();
  expect(window.location.pathname).toBe('/game');
});

test('restores an unresolved current encounter without navigating away', async () => {
  renderApp('/game');
  expect(await screen.findByRole('heading', { name: /安全屋|常规作战|奇境/ })).toBeVisible();
  expect(window.location.pathname).toBe('/game');
});
```

- [ ] **Step 2: Run and confirm GamePage is missing**

Run: `npm test -- src/features/game/GamePage.test.tsx`

Expected: FAIL because `/game` does not yet render `GamePage`.

- [ ] **Step 3: Extract the persistent HUD and presence**

```tsx
export function GameHud(props: GameHudProps) {
  return <RunStatusBar run={props.run} rosmontis={props.rosmontis} progression={props.progression} echoes={props.echoes} scoutPoints={props.scoutPoints} moduleCount={props.moduleCount} />;
}

export function RosmontisPresence(props: RosmontisPresenceProps) {
  return <section id="rosmontis-presence" aria-label="迷迭香陪伴交互"><RosmontisQuotePanel /><CompanionInteractionBar rosmontis={props.rosmontis} bossPhase={props.bossPhase} onAction={props.onAction} /></section>;
}
```

Do not reuse `TacticalOverview`; it contains removed location, pending-intel, and old-character data.

- [ ] **Step 4: Build NodeScene from authoritative encounter props**

`NodeScene` renders a node heading, `GreatswordActions`, `EncounterPanel`, module inventory, LLM director, Tavern game view, and a `返回迷宫` button. The return button is disabled when `encounter && !encounter.resolved`, with the existing first-person blocking copy.

```tsx
<button id="game-return-to-maze" type="button" disabled={!encounter?.resolved} onClick={onReturnToMaze}>返回迷宫</button>
```

Place the actions inside one labelled scene rather than a permanent side panel:

```tsx
<section className="node-scene" data-node-type={node.type} aria-labelledby="game-node-scene-title">
  <header><span>{NODE_TYPE_NAMES[node.type]}</span><h2 id="game-node-scene-title">{brief?.title ?? NODE_TYPE_NAMES[node.type]}</h2></header>
  <GreatswordActions {...greatswordProps} />
  <EncounterPanel {...encounterProps} />
  <ModuleInventory modules={modules} />
  <LlmEventDirector />
  <TavernGameView />
  <button id="game-return-to-maze" type="button" disabled={!encounter?.resolved} onClick={onReturnToMaze}>返回迷宫</button>
</section>
```

- [ ] **Step 5: Compose GamePage and encounter restoration**

Use `useReducer(gameSceneReducer, pendingEncounter, restoreGameSceneState)`. Keep the existing `beginCurrentEncounter` effect; when a pending unresolved encounter appears, dispatch `open-node`. During this task render the current `RunMazePanel` in map phase so all existing movement remains operational until Task 7 replaces it.

```tsx
const [scene, dispatchScene] = useReducer(gameSceneReducer, pendingEncounter, restoreGameSceneState);
useEffect(() => {
  if (run.phase === 'exploring' && !pendingEncounter) beginCurrentEncounter();
}, [beginCurrentEncounter, pendingEncounter, run.currentNodeId, run.phase]);
useEffect(() => {
  if (pendingEncounter && !pendingEncounter.resolved) dispatchScene({ type: 'open-node', nodeId: pendingEncounter.nodeId });
}, [pendingEncounter]);
```

- [ ] **Step 6: Verify and commit**

Run: `npm test -- src/features/game/GamePage.test.tsx src/features/operation/GreatswordActions.test.tsx src/features/operation/EncounterPanel.test.tsx && npm run typecheck`

```bash
git add src/features/game src/app/router.tsx
git commit -m "feat: compose unified game workspace"
git push origin codex/rosemary-memory-maze
```

---

### Task 6: Replace the Global Sidebar with Top Navigation and New Routes

**Files:**
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/AppShell.test.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/app/app-shell.css`
- Modify: `src/app/router.tsx`
- Modify: `index.html`
- Modify: `package.json`
- Modify: `src/test/accessibility.test.tsx`
- Modify: `src/test/uniqueIds.test.tsx`

**Interfaces:**
- Consumes: route pages from Tasks 3–5.
- Produces: top navigation and legacy redirects.

- [ ] **Step 1: Replace shell expectations with the new navigation contract**

```tsx
test('uses a five-item top menu and no global sidebar', async () => {
  renderApp('/game');
  expect(await screen.findByRole('navigation', { name: '顶部菜单' })).toBeVisible();
  for (const label of ['游戏', '记忆图鉴', '迷迭香手记', '行动记录', '系统设置']) {
    expect(screen.getByRole('link', { name: label })).toBeVisible();
  }
  expect(document.querySelector('.terminal-sidebar')).toBeNull();
  expect(screen.queryByLabelText('终端主导航')).not.toBeInTheDocument();
});

test('collapses secondary links into an accessible mobile top menu', async () => {
  renderApp('/game');
  const toggle = await screen.findByRole('button', { name: '展开顶部菜单' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('link', { name: '系统设置' })).toBeVisible();
});

test.each(['/operation', '/memory', '/operators'])('%s redirects to the game route', async (path) => {
  renderApp(path);
  expect(await screen.findByRole('heading', { name: '迷迭香的记忆迷宫' })).toBeVisible();
  expect(window.location.pathname).toBe('/game');
});
```

- [ ] **Step 2: Run and confirm old navigation fails the contract**

Run: `npm test -- src/app/AppShell.test.tsx src/app/App.test.tsx`

Expected: FAIL because `.terminal-sidebar` exists and `/game` is not the only gameplay route.

- [ ] **Step 3: Implement exact routes and redirects**

```tsx
const GamePage = lazy(() => import('../features/game/GamePage'));
const CompendiumPage = lazy(() => import('../features/compendium/CompendiumPage'));
const DiaryPage = lazy(() => import('../features/diary/DiaryPage'));
const RecordsPage = lazy(() => import('../features/records/RecordsPage'));

{ index: true, element: <Navigate to="/game" replace /> },
{ path: 'game', element: <GamePage /> },
{ path: 'compendium', element: <CompendiumPage /> },
{ path: 'diary', element: <DiaryPage /> },
{ path: 'records', element: <RecordsPage /> },
{ path: 'settings', element: <SettingsPage /> },
{ path: 'operation', element: <Navigate to="/game" replace /> },
{ path: 'memory', element: <Navigate to="/game" replace /> },
{ path: 'operators', element: <Navigate to="/game" replace /> },
{ path: 'archive', element: <Navigate to="/compendium" replace /> },
{ path: 'log', element: <Navigate to="/records" replace /> },
```

- [ ] **Step 4: Implement the single-column shell**

Replace the `<aside>` with a sticky `<header className="app-topbar">`. Render brand, `<nav aria-label="顶部菜单">`, compact Run status, connection link to `/settings`, and shortcuts. Add local `menuOpen` state and `global-menu-toggle` with `aria-expanded`; at widths up to 767px it reveals the same five links in a top-anchored menu layer. Close the layer after a link is activated or Escape is pressed. Remove `TavernOrchestrator` state and modal from AppShell because its managers now live in settings.

```tsx
<header className="app-topbar">
  <NavLink className="app-brand" to="/game">迷迭香的记忆迷宫</NavLink>
  <button id="global-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="global-top-menu" aria-label={menuOpen ? '收起顶部菜单' : '展开顶部菜单'} onClick={() => setMenuOpen((open) => !open)}><Menu aria-hidden /></button>
  <nav id="global-top-menu" aria-label="顶部菜单" data-open={menuOpen}>{navItems.map((item) => <NavLink key={item.path} to={item.path} onClick={() => setMenuOpen(false)}>{item.label}</NavLink>)}</nav>
</header>
```

Set `.terminal-shell { min-height: 100dvh; }` and `.terminal-workspace { min-width: 0; }`; remove every grid column reserved for `.terminal-sidebar`.

- [ ] **Step 5: Rename visible metadata and package**

```html
<meta name="description" content="以迷迭香为主角的纯前端记忆迷宫肉鸽游戏" />
<title>迷迭香的记忆迷宫</title>
```

Set `package.json` name to `rosmontis-memory-labyrinth` without changing dependency versions.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- src/app/AppShell.test.tsx src/app/App.test.tsx src/test/accessibility.test.tsx src/test/uniqueIds.test.tsx && npm run typecheck`

```bash
git add index.html package.json src/app src/test/accessibility.test.tsx src/test/uniqueIds.test.tsx
git commit -m "refactor: replace sidebar with top game navigation"
git push origin codex/rosemary-memory-maze
```

---

### Task 7: Build the Dynamic Maze Stage

**Files:**
- Create: `src/features/game/MazeStage.tsx`
- Create: `src/features/game/MazeStage.test.tsx`
- Modify: `src/features/game/GamePage.tsx`
- Modify: `src/features/game/game.css`
- Reuse: `src/game/terminology.ts`

**Interfaces:**
- Consumes: `MazeGraph`, current node ID, `mazeViewMode`, movement lock, novel briefs, exploration charges, scout points.
- Produces: `onRequestEnter(nodeId)`, `onViewModeChange(mode)`, `onCameraChange(camera)`.

- [ ] **Step 1: Write direct-entry, locked-node, camera, and list tests**

```tsx
test('requests entry directly from a reachable graph node', async () => {
  const user = userEvent.setup();
  const onRequestEnter = vi.fn();
  render(<MazeStage maze={maze} currentNodeId="node-current" viewMode="graph" camera={{ x: 0, y: 0, scale: 1 }} onCameraChange={vi.fn()} onViewModeChange={vi.fn()} onRequestEnter={onRequestEnter} />);
  await user.click(screen.getByRole('button', { name: /奇境.*可抵达/ }));
  expect(onRequestEnter).toHaveBeenCalledWith('node-reachable');
  expect(screen.queryByRole('button', { name: '进入节点' })).not.toBeInTheDocument();
});

test('does not move a hidden node and explains its state', async () => {
  const onRequestEnter = vi.fn();
  render(<MazeStage {...requiredProps} onRequestEnter={onRequestEnter} />);
  expect(screen.getByRole('button', { name: /安全屋.*未侦测/ })).toBeDisabled();
  expect(onRequestEnter).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run and confirm MazeStage is missing**

Run: `npm test -- src/features/game/MazeStage.test.tsx`

Expected: FAIL because `MazeStage.tsx` does not exist.

- [ ] **Step 3: Implement SVG paths and semantic HTML nodes**

Use `buildMazeLayout` and `buildMazePath`. Render one `<path>` per `maze.edges`, and one `<button>` per `maze.nodes` over the SVG. Set `data-node-type`, `data-node-state`, `aria-current`, risk text, state text, and fixed ID `game-maze-node-${node.id}`.

Reachable nodes call `onRequestEnter` immediately. Hidden and corrupted nodes are disabled. A current node with an unresolved encounter calls `onRequestEnter(currentNodeId)`.

```tsx
<svg className="maze-routes" viewBox="0 0 100 100" aria-hidden="true">
  {maze.edges.map((edge) => <path key={edge.id} className={edge.locked ? 'is-locked' : undefined} d={buildMazePath(layout.get(edge.sourceId)!, layout.get(edge.targetId)!)} />)}
</svg>
{maze.nodes.map((node) => <button id={`game-maze-node-${node.id}`} data-node-id={node.id} data-node-type={node.type} data-node-state={node.id === currentNodeId ? 'current' : node.state} disabled={!canEnter(node)} onClick={() => onRequestEnter(node.id)}>{NODE_TYPE_NAMES[node.type]}<span>{NODE_STATE_LABELS[node.state]}</span></button>)}
```

- [ ] **Step 4: Add camera controls and keyboard-equivalent list**

Add buttons `game-maze-zoom-in`, `game-maze-zoom-out`, `game-maze-fit`, `game-maze-current`, and view switch `game-maze-view-switch`. Clamp scale to 0.75–1.8. Apply one transform to `.maze-camera` and batch pointer-drag updates through `requestAnimationFrame`.

List mode uses the same node array and direct `onRequestEnter`; it must not create different movement rules.

```ts
const clampScale = (value: number) => Math.min(1.8, Math.max(0.75, value));
const setScale = (scale: number) => onCameraChange({ ...camera, scale: clampScale(scale) });
const cameraStyle = { transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})` };
```

- [ ] **Step 5: Add visual node states and verify**

In `game.css`, style current scan ring, reachable breathing border, completed route, locked dash, unknown mask, and Boss lock ring. Add `@media (prefers-reduced-motion: reduce)` and `[data-motion="reduced"]` rules that disable every infinite animation.

Run: `npm test -- src/features/game/MazeStage.test.tsx src/features/game/mazeLayout.test.ts && npm run typecheck`

- [ ] **Step 6: Integrate and commit**

Replace `RunMazePanel` inside `GamePage` with `MazeStage`; retain exploration-power controls in a compact map toolbar or contextual panel.

```bash
git add src/features/game/MazeStage.tsx src/features/game/MazeStage.test.tsx src/features/game/GamePage.tsx src/features/game/game.css
git commit -m "feat: add dynamic accessible maze stage"
git push origin codex/rosemary-memory-maze
```

---

### Task 8: Integrate Node Entry, Theme Transitions, and Return

**Files:**
- Create: `src/features/game/NodeTransitionLayer.tsx`
- Create: `src/features/game/NodeTransitionLayer.test.tsx`
- Modify: `src/features/game/GamePage.tsx`
- Modify: `src/features/game/GamePage.test.tsx`
- Modify: `src/features/game/NodeScene.tsx`
- Modify: `src/features/game/game.css`

**Interfaces:**
- Consumes: `GameSceneState`, target `MazeNode`, motion preference.
- Produces: callbacks `onCommit(transitionId)`, `onOpened(nodeId)`, `onReturnFinished()`.

- [ ] **Step 1: Define timer and exactly-once movement behavior in tests**

```tsx
test('commits movement once at 220ms and opens the node without changing route', async () => {
  vi.useFakeTimers();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  renderApp('/game');
  const target = await screen.findByRole('button', { name: /可抵达/ });
  await user.click(target);
  act(() => vi.advanceTimersByTime(219));
  expect(useGameStore.getState().run.currentNodeId).not.toBe(target.getAttribute('data-node-id'));
  act(() => vi.advanceTimersByTime(1));
  const committedId = useGameStore.getState().run.currentNodeId;
  act(() => vi.advanceTimersByTime(1000));
  expect(useGameStore.getState().run.currentNodeId).toBe(committedId);
  expect(window.location.pathname).toBe('/game');
});
```

- [ ] **Step 2: Run and verify movement still uses the old immediate flow**

Run: `npm test -- src/features/game/GamePage.test.tsx src/features/game/NodeTransitionLayer.test.tsx`

Expected: FAIL because transition timing and visual layer are absent.

- [ ] **Step 3: Implement transition layer semantics**

`NodeTransitionLayer` renders a non-interactive overlay with `data-transition-node-type`, a route pulse, a focus aperture, and one status string such as `正在进入奇境`. It schedules commit at 220ms and visual completion at 720ms, clears timers on unmount or transition ID change, and never calls a stale callback.

For reduced motion, commit immediately in a layout effect and finish at 120ms. The rule mutation remains exactly once.

```tsx
useEffect(() => {
  const commitTimer = window.setTimeout(() => onCommit(transitionId), reducedMotion ? 0 : 220);
  const finishTimer = window.setTimeout(() => onOpened(node.id), reducedMotion ? 120 : 720);
  return () => { window.clearTimeout(commitTimer); window.clearTimeout(finishTimer); };
}, [node.id, onCommit, onOpened, reducedMotion, transitionId]);
return <div className="node-transition-layer" data-transition-node-type={node.type} role="status"><span>正在进入{NODE_TYPE_NAMES[node.type]}</span><i className="transition-route-pulse" /><i className="transition-aperture" /></div>;
```

- [ ] **Step 4: Wire the scene reducer to Store Actions**

`MazeStage.onRequestEnter` dispatches `request-node`. The commit callback calls `moveToNode` and dispatches `commit-node`. When the authoritative `pendingEncounter.nodeId` matches and is unresolved, dispatch `open-node`. The transition completion only hides presentation layers; it does not mutate the Run.

Escape dispatches `cancel-entry` only when `commitState === 'preview'`.

```ts
const commitNode = (transitionId: number) => {
  if (transitionId !== scene.transitionId || scene.commitState !== 'preview' || !scene.targetNodeId) return;
  moveToNode(scene.targetNodeId);
  dispatchScene({ type: 'commit-node', transitionId });
};
```

- [ ] **Step 5: Implement settlement and reverse return**

When `pendingEncounter.resolved` becomes true in node phase, dispatch `settle-node`. `NodeScene` displays reward/status summary and enables `game-return-to-maze`. Return dispatches `request-map`; after 420ms, or 120ms reduced motion, dispatch `finish-return` and focus `game-maze-node-${run.currentNodeId}`.

```ts
const finishReturn = () => {
  dispatchScene({ type: 'finish-return' });
  window.requestAnimationFrame(() => document.getElementById(`game-maze-node-${run.currentNodeId}`)?.focus());
};
```

- [ ] **Step 6: Add node-type CSS themes and verify**

Create selectors for all fixed node types: `combat`, `emergency-combat`, `safehouse`, `shop`, `encounter`, `dilemma`, `unknown`, `boss`. Each changes existing semantic tokens, stroke patterns, and overlay geometry only; no new asset is required.

Run: `npm test -- src/features/game/sceneState.test.ts src/features/game/NodeTransitionLayer.test.tsx src/features/game/GamePage.test.tsx && npm run typecheck`

- [ ] **Step 7: Commit and push**

```bash
git add src/features/game
git commit -m "feat: add themed node scene transitions"
git push origin codex/rosemary-memory-maze
```

---

### Task 9: Remove Legacy State and Migrate Saves to V8

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/data/demoData.ts`
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStateMigration.ts`
- Modify: `src/store/gameStateMigration.test.ts`
- Modify: `src/store/gameStore.test.ts`
- Modify: `src/store/selectors.ts`
- Modify: `src/features/tavern/projection/tavern-turn-projector.ts`
- Modify: `src/features/tavern/projection/tavern-turn-projector.test.ts`
- Modify: `src/features/tavern/runtime/TavernProvider.tsx`

**Interfaces:**
- Consumes: V7 persisted objects that can still contain `memoryMap`, `archive`, `actionLog`, and `ui.sidebarCollapsed`.
- Produces: V8 `GameDataState` without those fields and with `ui.mazeViewMode`.

- [ ] **Step 1: Write a V7 migration preservation test**

```ts
test('migrates V7 by dropping legacy domains while preserving the active Run', () => {
  const current = buildDemoState();
  const persisted = structuredClone(current) as unknown as Record<string, unknown>;
  persisted.memoryMap = { viewMode: 'list', nodes: [{ id: 'legacy' }], edges: [] };
  persisted.archive = { records: [{ id: 'legacy-archive' }], links: [] };
  persisted.actionLog = [{ id: 'legacy-log' }];
  const migrated = migrateGameState(persisted, current);
  expect(migrated.run.id).toBe(current.run.id);
  expect(migrated.maze).toEqual(current.maze);
  expect(migrated.ui.mazeViewMode).toBe('list');
  expect(migrated).not.toHaveProperty('memoryMap');
  expect(migrated).not.toHaveProperty('archive');
  expect(migrated).not.toHaveProperty('actionLog');
});
```

- [ ] **Step 2: Run and confirm V7 fields survive incorrectly**

Run: `npm test -- src/store/gameStateMigration.test.ts`

Expected: FAIL because the merged state still contains all three legacy domains and no `ui.mazeViewMode`.

- [ ] **Step 3: Narrow GameDataState and UI types**

Remove `MemoryDirection`, `MemoryLayer`, `ArchiveKind`, `MemoryNode`, `MemoryEdge`, `MemoryMapState`, `ArchiveRecord`, `ArchiveLink`, `ArchiveState`, `ActionLogEntry`, and their fields from `GameDataState`. Remove `UiState.sidebarCollapsed`; add:

```ts
export interface UiState {
  activeDialog: string | null;
  notifications: NotificationItem[];
  migrationNotice: 'three-to-five-floors' | null;
  mazeViewMode: 'graph' | 'list';
  preferences: UiPreferences;
}
```

Remove the legacy event variants `memory.node.discovered`, `archive.clue.discovered`, `archive.npc.discovered`, and `log.turn.completed` from `TacticalDomainEvent`.

- [ ] **Step 4: Remove legacy Store Actions and materialization**

Delete `completeNarrativeOutcome`, `setMemoryView`, `expandMemoryNode`, every archive action, and `addArchiveRecord`. Simplify Tavern session materialization to retained session/operator events only. Keep `applyTavernEvents`, `activateTavernProjection`, and `branchTavernProjection` because Tavern still needs deterministic retained-event replay.

Remove old fields from `buildPersistedState`. Set persist version to `8`.

- [ ] **Step 5: Implement explicit V8 migration**

Do not spread the whole persisted object into the return value. Build the merge from an allowlist of retained keys, then set:

```ts
const legacyMap = isRecord(persisted.memoryMap) ? persisted.memoryMap : null;
merged.ui.mazeViewMode = legacyMap?.viewMode === 'list' || legacyMap?.viewMode === 'graph'
  ? legacyMap.viewMode
  : isRecord(persisted.ui) && (persisted.ui.mazeViewMode === 'list' || persisted.ui.mazeViewMode === 'graph')
    ? persisted.ui.mazeViewMode
    : current.ui.mazeViewMode;
```

Returning an allowlisted `GameDataState` proves the removed keys cannot survive structural spreading.

- [ ] **Step 6: Remove old demo and projection data**

Delete `surfaceNodes`, `archiveRecords`, `deepMemoryClue`, `deepMemoryNode`, `memoryMap`, `archive`, and `actionLog` from `demoData.ts`. Replace old session copy with current game copy: operation code `记忆迷宫`, chapter `表层残响`, objective `引导迷迭香找回记忆碎片并抵达当前层出口`. Retain the single Rosmontis operator because current Tavern/session projections still consume it.

```ts
session: {
  operationCode: '记忆迷宫',
  chapter: '表层残响',
  phase: '探索中',
  objective: '引导迷迭香找回记忆碎片并抵达当前层出口',
  connection: '本地模拟已连接',
  globalRisk: 'B',
  squadStatus: '认知链路稳定',
},
ui: { activeDialog: null, notifications: [], migrationNotice: null, mazeViewMode: 'graph', preferences: defaultPreferences },
```

Update the projector to return only retained operator/session/squad events. Variable keys for removed memory and archive records must no longer be read.

- [ ] **Step 7: Verify focused and complete Store tests**

Run: `npm test -- src/store/gameStateMigration.test.ts src/store/gameStore.test.ts src/features/tavern/projection/tavern-turn-projector.test.ts src/features/tavern/runtime/tavern-runtime.test.tsx && npm run typecheck`

- [ ] **Step 8: Commit and push**

```bash
git add src/types/game.ts src/data/demoData.ts src/store src/features/tavern/projection src/features/tavern/runtime/TavernProvider.tsx
git commit -m "refactor: remove legacy state and migrate saves to v8"
git push origin codex/rosemary-memory-maze
```

---

### Task 10: Delete Legacy Pages, CSS, Tests, and Story Residue

**Files:**
- Delete the legacy modules listed in the File Structure section once `rg` confirms no production imports.
- Modify: `src/features/operation/operation.css`
- Delete or reduce: `src/features/memory/memory.css`, `src/features/archive/archive.css`, `src/features/log/log.css`, `src/features/operators/operators.css`
- Modify: `src/features/settings/ResetDemoDialog.tsx`
- Modify: `src/sillytavern/default-content.ts`
- Modify: `src/sillytavern/default-content.test.ts`
- Modify: `src/sillytavern/character-card.test.ts`
- Create: `src/test/legacyRemovalContract.test.ts`

**Interfaces:**
- Consumes: production source tree.
- Produces: a source contract that fails when deleted UI concepts or dead imports return.

- [ ] **Step 1: Write the source-removal contract**

```ts
import fs from 'node:fs';
import path from 'node:path';

test('production source contains no removed archive timeline or old product title', () => {
  const forbidden = ['叙事档案', '情报关系图', '证据推理台', '战术时间线', '罗德岛意识战术终端'];
  const files = productionFiles(path.resolve('src'));
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const token of forbidden) expect(source, `${file} contains ${token}`).not.toContain(token);
  }
});

function productionFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) return entry.name === 'test' ? [] : productionFiles(target);
    return /\.(ts|tsx|css)$/.test(entry.name) && !/\.test\./.test(entry.name) ? [target] : [];
  });
}
```

`productionFiles` must exclude `*.test.*`, `src/test`, generated output, and documentation, while including `.ts`, `.tsx`, and `.css` production files.

- [ ] **Step 2: Run and capture the expected list of remaining sources**

Run: `npm test -- src/test/legacyRemovalContract.test.ts`

Expected: FAIL and name the old AppShell, archive, log, settings reset copy, and obsolete styles.

- [ ] **Step 3: Delete unreferenced legacy files**

Before each deletion group run:

```bash
rg -n "OperationPage|MemoryPage|OperatorsPage|ArchivePage|LogPage|MemoryGraph|MemoryInspector|ArchiveRelationGraph|ActionTimeline" src
```

Delete only files whose remaining matches are their own definitions or tests being removed in the same commit. Delete `NarrativeStream`, `narrativeEngine`, and their tests because the Tavern runtime already owns the active command and narrative path. Keep `CommandConsole`, Tavern history, Session manager, diary, game rules, and current encounter components.

- [ ] **Step 4: Remove obsolete CSS selectors and old narrative copy**

Remove `.terminal-sidebar`, old six-column mobile navigation, archive relation canvas, reasoning board, tactical timeline, old memory projection canvas, and TacticalOverview selectors. Do not remove styles used by the new `CompendiumPage`, `RecordsPage`, or Tavern managers; move the minimal required declarations to their owning feature styles.

Rewrite default character/preset metadata to use `迷迭香的记忆迷宫`, `表层残响`, and current five-floor terminology. Remove references to R-09,护理员伊莲,凌晨 03:17,失温病历,潮湿病历,深层合唱 from production defaults and demo content. Keep formally approved current floor names, including `雨幕病区`.

```ts
scenario: '博士陪同迷迭香进入记忆迷宫。她需要在指挥与陪伴下穿过五层创伤残响，找回记忆碎片并抵达核心花房。',
creatorNotes: '迷迭香的记忆迷宫默认角色卡，适用于单主角中文肉鸽叙事。',
```

- [ ] **Step 5: Correct reset copy**

The reset dialog lists Run progress, current maze, Rosmontis status, collection, UI preferences, and notifications. It must not mention pins, relationships, archive records, or tactical projection.

- [ ] **Step 6: Verify source, tests, and type graph**

Run: `npm test -- src/test/legacyRemovalContract.test.ts src/test/noEmoji.test.ts src/test/singleProtagonistContract.test.ts && npm run typecheck`

Run: `rg -n -g '!**/*.test.*' -g '!src/test/**' "叙事档案|情报关系图|证据推理台|战术时间线|罗德岛意识战术终端|护理员伊莲|R-09|03:17|失温病历|潮湿的儿童病历|墙体后的儿童合唱" src index.html`

Expected: no production matches; assertion strings are allowed only in tests excluded by the contract.

- [ ] **Step 7: Commit and push**

```bash
git add -A src index.html
git commit -m "refactor: remove obsolete archive and timeline modules"
git push origin codex/rosemary-memory-maze
```

---

### Task 11: Complete Responsive, Accessibility, and Motion Behavior

**Files:**
- Modify: `src/app/app-shell.css`
- Modify: `src/features/game/game.css`
- Modify: `src/styles/responsive.css`
- Modify: `src/styles/global.css`
- Modify: `src/test/responsive-contract.test.ts`
- Modify: `src/test/accessibility.test.tsx`
- Modify: `src/test/interactive-source-ids.test.ts`
- Modify: `src/test/uniqueIds.test.tsx`

**Interfaces:**
- Consumes: final top bar and game workspace DOM.
- Produces: stable 375, 768, 1024, and 1440 layouts and motion fallbacks.

- [ ] **Step 1: Update structural contract tests**

```ts
test('mobile rules keep one top menu and one scroll owner', () => {
  expect(css).toContain('@media (max-width: 767px)');
  expect(css).toContain('.app-topbar');
  expect(css).toContain('.game-stage');
  expect(css).not.toContain('.terminal-sidebar');
  expect(css).not.toMatch(/grid-template-columns:\s*repeat\(6/);
});
```

Add component assertions that route focus lands on `main-content`, node entry focus lands on the node heading, return focus lands on the current node, and every icon-only control has an accessible name.

- [ ] **Step 2: Run and confirm residual responsive assumptions fail**

Run: `npm test -- src/test/responsive-contract.test.ts src/test/accessibility.test.tsx src/test/interactive-source-ids.test.ts src/test/uniqueIds.test.tsx`

Expected: FAIL on old sidebar/mobile-grid selectors or missing new control IDs.

- [ ] **Step 3: Implement desktop and mobile composition**

- Desktop: sticky top bar, full-width stage, bounded narrative measure, no fixed navigation rail.
- 1024px: menu may wrap into an overflow control; HUD uses two rows.
- 768px: map and node scene remain within viewport, contextual panels stack, no nested horizontal page scroll.
- 375px: `min-height: 100dvh`, one-column node scene, 44px controls, safe bottom padding.

```css
.terminal-shell{min-height:100dvh}.terminal-main{min-width:0;padding:clamp(16px,2.5vw,40px)}
@media(max-width:767px){.app-top-menu[data-open="false"]{display:none}.game-hud,.node-scene{grid-template-columns:minmax(0,1fr)}.maze-stage{min-height:520px}button,a[href]{min-height:44px}}
@media(max-width:375px){.terminal-main{padding-inline:12px}.game-stage{margin-inline:-12px}}
```

- [ ] **Step 4: Implement reduced motion and focus guarantees**

Under both `@media (prefers-reduced-motion: reduce)` and `html[data-motion="reduced"]`, disable parallax, infinite breathing, CRT jitter, camera zoom, and node aperture scaling. Retain static borders and the 120ms crossfade.

Add `scroll-margin-top` for focused headings under the sticky top bar and preserve a 2px visible focus outline at 3:1 contrast.

```css
@media(prefers-reduced-motion:reduce){.maze-node,.maze-route,.node-transition-layer *{animation:none!important;transition-duration:120ms!important}}
html[data-motion="reduced"] .maze-node,html[data-motion="reduced"] .maze-route,html[data-motion="reduced"] .node-transition-layer *{animation:none!important;transition-duration:120ms!important}
.game-stage :focus-visible{outline:2px solid var(--color-memory-blue);outline-offset:3px}.node-scene h2{scroll-margin-top:96px}
```

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/test/responsive-contract.test.ts src/test/accessibility.test.tsx src/test/interactive-source-ids.test.ts src/test/uniqueIds.test.tsx && npm run typecheck`

```bash
git add src/app/app-shell.css src/features/game/game.css src/styles src/test
git commit -m "fix: complete responsive and accessible game workspace"
git push origin codex/rosemary-memory-maze
```

---

### Task 12: End-to-End Gameplay and Final Verification

**Files:**
- Create: `e2e/unified-game-workspace.spec.ts`
- Modify: `e2e/navigation-modals.spec.ts`
- Modify: `e2e/responsive.spec.ts`
- Modify: `e2e/core-flow.spec.ts`
- Modify: `e2e/five-floor-offline.spec.ts`
- Modify: `e2e/tavern-management.spec.ts`
- Modify: `e2e/tavern-runtime.spec.ts`
- Modify: `docs/verification/2026-08-31-unified-game-workspace-audit.md`

**Interfaces:**
- Consumes: final browser application.
- Produces: browser evidence for routing, continuity, legacy removal, responsive behavior, reduced motion, and preserved gameplay.

- [ ] **Step 1: Write the new end-to-end flow before adjusting old specs**

```ts
test('enters and resolves a node without leaving the game route', async ({ page }) => {
  await page.goto('/game');
  await expect(page.getByRole('heading', { name: '迷迭香的记忆迷宫' })).toBeVisible();
  const reachable = page.locator('[data-node-state="reachable"]').first();
  await reachable.click();
  await expect(page).toHaveURL(/\/game$/);
  await expect(page.locator('[data-scene-phase="node"]')).toBeVisible();
  await resolveCurrentEncounter(page);
  await page.getByRole('button', { name: '返回迷宫' }).click();
  await expect(page.locator('[data-scene-phase="map"]')).toBeVisible();
});

test('legacy routes redirect and removed workspaces never render', async ({ page }) => {
  for (const path of ['/operation', '/memory', '/operators']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/game$/);
  }
  await page.goto('/compendium');
  await expect(page.getByText('叙事档案')).toHaveCount(0);
  await page.goto('/records');
  await expect(page.getByText('战术时间线')).toHaveCount(0);
});
```

- [ ] **Step 2: Run the new spec and verify it fails for missing final behavior**

Run: `npx playwright test e2e/unified-game-workspace.spec.ts --project=chromium`

Expected: FAIL until route, transition, selectors, and helpers match the final application.

- [ ] **Step 3: Update existing E2E routes without weakening gameplay assertions**

Replace `/operation` and `/memory` navigation with `/game` and in-page scene actions. Preserve the complete offline five-floor assertion, fifth-floor Boss dual-phase assertion, LLM fallback assertion, sixth-floor mindsea assertion, Tavern management CRUD, and runtime streaming assertions.

- [ ] **Step 4: Add mobile and reduced-motion cases**

At 375×812 assert no horizontal document overflow, top menu remains operable, map/list switch works, and node actions are visible. With `reducedMotion: 'reduce'`, assert the transition finishes within 200ms and no infinite animation is active on the transition layer.

- [ ] **Step 5: Run the full verification matrix**

Run in this order and record exact counts and durations:

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Also run:

```bash
git diff --check
rg -n -g '!**/*.test.*' -g '!src/test/**' "叙事档案|情报关系图|证据推理台|战术时间线|罗德岛意识战术终端|护理员伊莲|R-09|03:17|失温病历|潮湿的儿童病历|墙体后的儿童合唱" src index.html
```

Expected: all test suites pass; build succeeds; no production residue; no console errors in Playwright.

- [ ] **Step 6: Write the verification audit**

Create `docs/verification/2026-08-31-unified-game-workspace-audit.md` with one row per spec section: requirement, authoritative file or test, command, result, and unresolved issue. The unresolved-issue column must contain `无` only when evidence exists.

- [ ] **Step 7: Commit, push, and verify remote parity**

```bash
git add e2e docs/verification/2026-08-31-unified-game-workspace-audit.md
git commit -m "test: verify unified game workspace"
git push origin codex/rosemary-memory-maze
git rev-parse HEAD
git ls-remote origin refs/heads/codex/rosemary-memory-maze
git status --short --branch
```

Expected: local and remote hashes are identical and the working tree is clean.
