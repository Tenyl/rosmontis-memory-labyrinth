# SillyTavern Rhodes Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将罗德岛意识战术终端升级为具备角色卡、玩家身份、世界书、预设、持久化多会话、流式游戏视图和跨页战术投影的纯前端 SillyTavern TRPG。

**Architecture:** 复制并适配技能提供的 SillyTavern v3 React 内核，以 Dexie 保存酒馆实体；通过 `TavernProvider` 统一 UI 状态和动作，通过 `projectTavernTurn` 将解析后的回合投影到现有 Zustand 战术状态。所有外部生成经可替换的流式传输端口运行，未配置远程 API 时使用同接口的本地模拟适配器。

**Tech Stack:** React 19、TypeScript 7、Vite 8、React Router 7、Zustand 5、Dexie、Vitest、Testing Library、fake-indexeddb、Playwright、Phosphor Icons。

**Spec:** `docs/superpowers/specs/2026-08-29-sillytavern-rhodes-integration-design.md`

## Global Constraints

- 纯前端实现，不创建服务器、API 路由、代理、云数据库或后端凭据存储。
- 默认启用游戏模式和六标签；次 API 默认关闭；schema-first 状态系统不启用。
- 保留六个顶级路由及其罗德岛医疗/战术终端视觉语言，界面文字中文化。
- 使用 Phosphor SVG 图标，不以 emoji 作为结构图标，不调用浏览器原生 `alert`、`confirm` 或 `prompt`。
- 每个交互元素具有唯一且描述性的 ID；新增表单使用可见标签和字段级错误。
- 新行为遵循 TDD：先写测试并确认按预期失败，再写最小实现。
- 每个任务完成后运行针对性测试、提交，并执行 `git push origin HEAD:main`。
- 所有 API 密钥仅保存在当前浏览器，不写入日志、源码、普通导出包或测试快照。
- 375、768、1024、1440 宽度无页面级横向溢出，支持 `prefers-reduced-motion`。

---

### Task 1: 建立 SillyTavern v3 内核与 IndexedDB 基线

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src/test/setup.ts`
- Create: `src/sillytavern/types.ts`
- Create: `src/sillytavern/database.ts`
- Create: `src/sillytavern/lorebook-engine.ts`
- Create: `src/sillytavern/prompt-assembler.ts`
- Create: `src/sillytavern/variables.ts`
- Create: `src/sillytavern/stream-parser.ts`
- Create: `src/sillytavern/vars-merger.ts`
- Create: `src/sillytavern/api-router.ts`
- Create: `src/sillytavern/api-tools.ts`
- Create: `src/sillytavern/importer.ts`
- Create: `src/sillytavern/editor-utils.ts`
- Create: `src/sillytavern/index.ts`
- Create: `src/sillytavern/lorebook-engine.test.ts`
- Copy and adapt: `src/sillytavern/*.test.ts` from the skill React templates

**Interfaces:**
- Produces: `initializeDatabase(): Promise<void>`, CRUD functions for lorebooks/presets/chats/settings, `assemblePrompt(options): AssembleResult`, `createLorebookEngine(book)`, `new StreamTagParser(tags, opaqueTags)` and `createApiRouter(settings, deps)`.
- Consumes: Skill templates under `C:/Users/Ya/.codex/skills/sillytavern-web/templates/react/`.

- [ ] **Step 1: Install runtime and test dependencies**

Run: `pnpm add dexie && pnpm add -D fake-indexeddb`

Expected: `package.json` records `dexie` and `fake-indexeddb`, and the lockfile updates without peer dependency errors.

- [ ] **Step 2: Copy template tests and write the missing lorebook behavior test**

Create `src/sillytavern/lorebook-engine.test.ts` with literal expectations:

```ts
it('requires a secondary keyword for an and_all selective entry', () => {
  const book = makeLorebook({
    keys: ['迷迭香'],
    secondaryKeys: ['记忆'],
    selective: true,
    selectiveLogic: 'and_all',
  });
  expect(createLorebookEngine(book).scan('迷迭香进入走廊')).toHaveLength(0);
  expect(createLorebookEngine(book).scan('迷迭香进入记忆走廊')).toHaveLength(1);
});
```

The `makeLorebook` fixture must include every documented `Lorebook` and `LorebookEntry` field used by the real engine.

- [ ] **Step 3: Run the core tests and confirm RED**

Run: `pnpm vitest run src/sillytavern`

Expected: FAIL because `src/sillytavern` implementations do not exist.

- [ ] **Step 4: Copy the React v3 core templates and fix project-specific TypeScript boundaries**

Copy template source through PowerShell `Copy-Item`, then use `apply_patch` for adaptations. Replace broad `any` at public boundaries with `unknown` plus type guards; correct `not_all` and `not_any` secondary-key semantics; inject randomness into the lorebook engine for deterministic tests.

Required engine signature:

```ts
export function createLorebookEngine(
  lorebook: Lorebook,
  random: () => number = Math.random,
): LorebookEngine;
```

- [ ] **Step 5: Configure IndexedDB for tests and run GREEN**

Add `import 'fake-indexeddb/auto';` to `src/test/setup.ts` and reset the named database after each database test.

Run: `pnpm vitest run src/sillytavern`

Expected: all core template and lorebook tests PASS with no unhandled promise warnings.

- [ ] **Step 6: Verify and publish Task 1**

Run: `pnpm typecheck && pnpm test && pnpm build`

Commit: `feat: install SillyTavern core runtime`

Push: `git push origin HEAD:main`

---

### Task 2: 增加角色卡、玩家身份、默认资料与安全备份

**Files:**
- Modify: `src/sillytavern/types.ts`
- Modify: `src/sillytavern/database.ts`
- Modify: `src/sillytavern/prompt-assembler.ts`
- Modify: `src/sillytavern/importer.ts`
- Modify: `src/sillytavern/index.ts`
- Create: `src/sillytavern/character-card.ts`
- Create: `src/sillytavern/backup.ts`
- Create: `src/sillytavern/default-content.ts`
- Create: `src/sillytavern/character-card.test.ts`
- Create: `src/sillytavern/backup.test.ts`
- Create: `src/sillytavern/default-content.test.ts`

**Interfaces:**
- Produces: `CharacterCard`, `Persona`, `importCharacterCardV2`, `exportCharacterCardV2`, `exportTavernBackup`, `importTavernBackup`, `seedDefaultTavernContent`.
- Consumes: Task 1 database and prompt assembler.

- [ ] **Step 1: Write failing character-card and backup tests**

```ts
it('round-trips a V2 card without losing character fields', () => {
  const card = importCharacterCardV2(rosmontisV2Fixture);
  expect(exportCharacterCardV2(card).data).toMatchObject({
    name: '迷迭香',
    personality: '寡言、敏锐，对记忆残响高度敏感',
    first_mes: '博士，链接已经稳定。',
  });
});

it('omits API keys from a normal backup', async () => {
  await saveSettings(settingsWithSecret('sk-private'));
  const backup = await exportTavernBackup();
  expect(JSON.stringify(backup)).not.toContain('sk-private');
});
```

- [ ] **Step 2: Run targeted tests and confirm RED**

Run: `pnpm vitest run src/sillytavern/character-card.test.ts src/sillytavern/backup.test.ts src/sillytavern/default-content.test.ts`

Expected: FAIL because character, backup and seed APIs are missing.

- [ ] **Step 3: Extend the Dexie schema and implement imports**

Add versioned `characters` and `personas` stores. Validate imported JSON with explicit guards for `spec === 'chara_card_v2'`, preserve extension fields in `extensions`, and reject arrays or empty names with Chinese recoverable error messages.

- [ ] **Step 4: Seed complete editable defaults**

Implement idempotent seeds for 迷迭香, 博士, three lorebooks, the 认知战术叙事 preset and 雨幕回声 chat. The seed must not overwrite user-edited records when rerun.

- [ ] **Step 5: Integrate character/persona fields into prompt assembly**

Update `AssembleOptions` to accept `character: CharacterCard` and `persona: Persona`; resolve `charDescription`, `charPersonality`, `scenario`, `personaDescription` and `dialogueExamples` from those entities rather than preset ad-hoc fields.

- [ ] **Step 6: Run GREEN and publish Task 2**

Run: `pnpm vitest run src/sillytavern && pnpm typecheck && pnpm build`

Commit: `feat: add character cards and tavern backups`

Push: `git push origin HEAD:main`

---

### Task 3: 构建统一 TavernRuntime 与流式传输端口

**Files:**
- Create: `src/features/tavern/runtime/tavern-transport.ts`
- Create: `src/features/tavern/runtime/local-tavern-transport.ts`
- Create: `src/features/tavern/runtime/openai-tavern-transport.ts`
- Create: `src/features/tavern/runtime/TavernProvider.tsx`
- Create: `src/features/tavern/runtime/useTavern.ts`
- Create: `src/features/tavern/runtime/tavern-runtime.test.tsx`
- Create: `src/features/tavern/runtime/local-tavern-transport.test.ts`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Produces: `TavernTransport.stream(request, signal): AsyncIterable<string>`, `TavernProvider`, `useTavern(): TavernRuntimeValue`.
- Consumes: Task 1–2 persistence, parser, API settings and defaults.

- [ ] **Step 1: Write failing runtime behavior tests**

```tsx
it('creates an initial chat and restores it after remount', async () => {
  const first = renderRuntimeProbe();
  await first.createChat('认知测试');
  first.unmount();
  const second = renderRuntimeProbe();
  expect(await second.findActiveChatName()).toBe('认知测试');
});

it('aborts a streaming turn without committing pending variables', async () => {
  const transport = createChunkTransport(['<maintext>雨声', '</maintext><vars>{"sanity":41}</vars>']);
  const runtime = renderRuntimeProbe({ transport });
  await runtime.send('前进');
  runtime.stop();
  expect(runtime.variables()).not.toHaveProperty('sanity', 41);
});
```

- [ ] **Step 2: Run runtime tests and confirm RED**

Run: `pnpm vitest run src/features/tavern/runtime`

Expected: FAIL because provider and transport modules are absent.

- [ ] **Step 3: Implement transport adapters**

The OpenAI adapter must parse `text/event-stream`, handle `[DONE]`, expose HTTP/timeout errors, and never include authorization headers in thrown messages. The local adapter must yield deterministic tagged chunks asynchronously and honor AbortSignal.

- [ ] **Step 4: Implement Provider state machine**

Use explicit statuses `booting | ready | assembling | streaming | paused | complete | interrupted | failed`. Expose CRUD actions, `sendMessage`, `stopGeneration`, `retryLastTurn`, `editAndRegenerate`, `deleteMessagesFrom`, and `branchFromMessage`. Persist the user message before network work and commit assistant content/variables only at a valid terminal state.

- [ ] **Step 5: Run GREEN and publish Task 3**

Run: `pnpm vitest run src/features/tavern/runtime && pnpm typecheck && pnpm test`

Commit: `feat: add persistent tavern runtime`

Push: `git push origin HEAD:main`

---

### Task 4: 建立酒馆编排抽屉与会话/变量管理

**Files:**
- Create: `src/features/tavern/components/TavernOrchestrator.tsx`
- Create: `src/features/tavern/components/SessionManager.tsx`
- Create: `src/features/tavern/components/VariablesPanel.tsx`
- Create: `src/features/tavern/components/TavernEntityTabs.tsx`
- Create: `src/features/tavern/components/tavern-components.css`
- Create: `src/features/tavern/components/TavernOrchestrator.test.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/app-shell.css`

**Interfaces:**
- Produces: global drawer with tab IDs `tavern-tab-sessions`, `tavern-tab-characters`, `tavern-tab-lorebooks`, `tavern-tab-presets`, `tavern-tab-variables`.
- Consumes: `useTavern` actions and existing `Dialog` focus behavior.

- [ ] **Step 1: Write the failing orchestrator interaction test**

```tsx
it('creates, loads, renames, branches and confirms deletion of sessions', async () => {
  renderWithRuntime(<TavernOrchestrator open onClose={vi.fn()} />);
  await user.click(screen.getByRole('button', { name: '新建会话' }));
  await user.type(screen.getByLabelText('会话名称'), '坍塌区入口');
  await user.click(screen.getByRole('button', { name: '创建并载入' }));
  expect(await screen.findByText('坍塌区入口')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '删除坍塌区入口' }));
  expect(screen.getByRole('dialog', { name: '确认删除会话' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the component test and confirm RED**

Run: `pnpm vitest run src/features/tavern/components/TavernOrchestrator.test.tsx`

Expected: FAIL because the orchestrator UI is missing.

- [ ] **Step 3: Implement the drawer and session manager**

Use a route-independent drawer with focus restoration. Session rows show character, message count, branch badge and last update. Destructive actions open the existing internal Dialog primitive; empty names receive inline errors.

- [ ] **Step 4: Implement typed variable editing**

Display each variable with current value and previous-turn delta. Parse numeric inputs only when the full value is a finite number. Empty keys are rejected and duplicate keys show a field-level error.

- [ ] **Step 5: Run GREEN and publish Task 4**

Run: `pnpm vitest run src/features/tavern/components/TavernOrchestrator.test.tsx src/test/accessibility.test.tsx && pnpm typecheck`

Commit: `feat: add tavern orchestration workspace`

Push: `git push origin HEAD:main`

---

### Task 5: 完成角色卡、Persona、世界书与预设编辑体验

**Files:**
- Create: `src/features/tavern/characters/CharacterManager.tsx`
- Create: `src/features/tavern/characters/CharacterEditorDialog.tsx`
- Create: `src/features/tavern/characters/PersonaManager.tsx`
- Create: `src/features/tavern/lorebooks/LorebookManager.tsx`
- Adapt from skill: `src/features/tavern/lorebooks/LorebookEditorDialog.tsx`
- Adapt from skill: `src/features/tavern/lorebooks/EntryForm.tsx`
- Create: `src/features/tavern/lorebooks/KeywordPreview.tsx`
- Create: `src/features/tavern/presets/PresetManager.tsx`
- Adapt from skill: `src/features/tavern/presets/PresetEditorDialog.tsx`
- Adapt from skill: `src/features/tavern/presets/PromptOrderEditor.tsx`
- Create: `src/features/tavern/entities.test.tsx`
- Modify: `src/features/operators/OperatorsPage.tsx`
- Modify: `src/features/archive/ArchivePage.tsx`

**Interfaces:**
- Produces: complete CRUD and JSON import/export UI for characters, personas, lorebooks and presets.
- Consumes: Task 2 entity APIs, Task 4 tabs and existing operator/archive views.

- [ ] **Step 1: Write failing entity management tests**

Test these observable behaviors with real forms: importing a valid V2 card selects it; malformed card shows a Chinese field-independent import error; multi-lorebook import reports successes and failures separately; prompt order keyboard buttons change the persisted order.

- [ ] **Step 2: Run the entity tests and confirm RED**

Run: `pnpm vitest run src/features/tavern/entities.test.tsx`

Expected: FAIL because management components do not exist.

- [ ] **Step 3: Implement character and Persona managers**

Provide visible labels for name, description, personality, scenario, first message, examples, creator notes and avatar URL/data. The default 迷迭香 profile remains the active operator card; activating another card changes prompt identity but does not delete the tactical squad.

- [ ] **Step 4: Implement worldbook manager and trigger preview**

Adapt skill editor utilities instead of duplicating entry mutation logic. The preview accepts sample text and renders the actual `LorebookEngine.scan` result, including matched keywords and insertion order.

- [ ] **Step 5: Implement preset editor**

Expose temperature, maximum tokens, context size, top-p, frequency/presence penalties, system prompts and ordered prompt blocks. Move actions have both pointer and keyboard buttons; disabled blocks expose `aria-pressed` state.

- [ ] **Step 6: Integrate managers into operator/archive pages**

Add “角色与身份” tab to Operators and “世界书” tab to Archive while retaining all current views. Opening a manager changes neither route nor scroll position.

- [ ] **Step 7: Run GREEN and publish Task 5**

Run: `pnpm vitest run src/features/tavern/entities.test.tsx src/features/operators src/features/archive && pnpm typecheck && pnpm build`

Commit: `feat: build tavern entity editors`

Push: `git push origin HEAD:main`

---

### Task 6: 重构作战主控台为流式 Tavern GameView

**Files:**
- Create: `src/features/tavern/game/TavernGameView.tsx`
- Adapt from skill: `src/features/tavern/game/MainTextPane.tsx`
- Adapt from skill: `src/features/tavern/game/OptionList.tsx`
- Adapt from skill: `src/features/tavern/game/ThinkingFold.tsx`
- Adapt from skill: `src/features/tavern/game/HistoryDrawer.tsx`
- Create: `src/features/tavern/game/TurnTelemetry.tsx`
- Create: `src/features/tavern/game/tavern-game.css`
- Create: `src/features/tavern/game/TavernGameView.test.tsx`
- Modify: `src/features/operation/OperationPage.tsx`
- Modify: `src/features/operation/CommandConsole.tsx`
- Modify: `src/features/operation/TacticalOverview.tsx`
- Modify: `src/features/operation/operation.css`

**Interfaces:**
- Produces: game-mode rendering and input mapped to `useTavern`.
- Consumes: Task 3 runtime, current tactical overview and command modes.

- [ ] **Step 1: Write failing GameView tests**

```tsx
it('streams main text, reveals complete options, and keeps thinking collapsed', async () => {
  renderGameWithChunks([
    '<thinking>分析声源</thinking><maintext>雨幕中出现',
    '三条路径。</maintext><option>检查门牌</option><option>呼叫小队</option>',
  ]);
  await user.click(screen.getByRole('button', { name: '发送战术指令' }));
  expect(await screen.findByText('雨幕中出现三条路径。')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '选择：检查门牌' })).toBeInTheDocument();
  expect(screen.queryByText('分析声源')).not.toBeVisible();
});
```

Also test stop, retry, numeric option shortcut and edit/regenerate history.

- [ ] **Step 2: Run GameView tests and confirm RED**

Run: `pnpm vitest run src/features/tavern/game/TavernGameView.test.tsx`

Expected: FAIL because the game components do not exist.

- [ ] **Step 3: Implement the tagged content presentation**

Render assistant turns from parsed message segments, not by reparsing JSX text. Append an option only after its closing tag. Expose the thinking control as an accessible disclosure with `aria-expanded`.

- [ ] **Step 4: Connect command, generation and history controls**

Use one primary send action. Stop aborts the active transport; retry reuses the saved user message; editing a user message truncates later messages before regeneration; options fill the command input without automatic submission.

- [ ] **Step 5: Replace the local-only OperationPage pipeline**

Remove direct use of `createLocalNarrativeEngine` from `OperationPage`. Keep the previous engine only behind `LocalTavernTransport`, so both simulated and remote runs exercise the same parser and persistence path.

- [ ] **Step 6: Run GREEN and publish Task 6**

Run: `pnpm vitest run src/features/tavern/game src/features/operation && pnpm typecheck && pnpm build`

Commit: `feat: turn operation console into Tavern game view`

Push: `git push origin HEAD:main`

---

### Task 7: 将回合变量投影到六个战术页面

**Files:**
- Create: `src/features/tavern/projection/tavern-turn-projector.ts`
- Create: `src/features/tavern/projection/tavern-turn-projector.test.ts`
- Modify: `src/types/game.ts`
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStore.test.ts`
- Modify: `src/features/memory/MemoryInspector.tsx`
- Modify: `src/features/operators/RosmontisProfile.tsx`
- Modify: `src/features/archive/ArchiveGrid.tsx`
- Modify: `src/features/log/ActionTimeline.tsx`

**Interfaces:**
- Produces: `projectTavernTurn(input: TavernTurnProjectionInput): TacticalDomainEvent[]` and `applyTavernEvents(events)` store action.
- Consumes: committed `sum`, `vars`, message/session IDs and matched lorebook entries.

- [ ] **Step 1: Write failing literal projection tests**

```ts
it('projects a completed turn into operator, memory, archive and log events', () => {
  expect(projectTavernTurn({
    sessionId: 'chat-rain',
    messageId: 'msg-9',
    summary: '发现儿童意识回声',
    variables: {
      rosmontis_stress: 47,
      memory_node_title: '沉没诊疗层',
      memory_node_risk: 'A',
      clue_title: '被涂改的病历',
    },
    previousVariables: { rosmontis_stress: 39 },
  })).toEqual([
    { type: 'operator.stress.changed', operatorId: 'rosmontis', value: 47, sourceMessageId: 'msg-9' },
    { type: 'memory.node.discovered', title: '沉没诊疗层', risk: 'A', sourceMessageId: 'msg-9' },
    { type: 'archive.clue.discovered', title: '被涂改的病历', sourceMessageId: 'msg-9' },
    { type: 'log.turn.completed', summary: '发现儿童意识回声', sourceMessageId: 'msg-9' },
  ]);
});
```

- [ ] **Step 2: Run projector tests and confirm RED**

Run: `pnpm vitest run src/features/tavern/projection src/store/gameStore.test.ts`

Expected: FAIL because projector events and store action are missing.

- [ ] **Step 3: Implement validated projection**

Clamp stress and sanity to 0–100; accept risk only from `S | A | B | C | D`; require non-empty titles; derive deterministic IDs from session/message/type so retries remain idempotent. Unknown variables produce no tactical event but remain stored in the chat.

- [ ] **Step 4: Apply events after committed turns**

Invoke projection exactly once after a complete assistant turn. Add source session/message IDs to affected tactical entities. Switching chats loads that chat's projection snapshot without deleting other session data.

- [ ] **Step 5: Surface provenance across pages**

Memory, operator, archive and log views show a compact “来自会话 / 回合” control that opens the matching history position. If the source chat was deleted, show an unavailable explanation rather than a broken action.

- [ ] **Step 6: Run GREEN and publish Task 7**

Run: `pnpm vitest run src/features/tavern/projection src/store src/features/memory src/features/operators src/features/archive src/features/log && pnpm typecheck`

Commit: `feat: project tavern turns into tactical state`

Push: `git push origin HEAD:main`

---

### Task 8: 完成接口、解析、预设和本地数据设置

**Files:**
- Create: `src/features/settings/TavernConnectionSettings.tsx`
- Create: `src/features/settings/TavernParsingSettings.tsx`
- Create: `src/features/settings/TavernDataSettings.tsx`
- Create: `src/features/settings/TavernSettings.test.tsx`
- Modify: `src/features/settings/SettingsPage.tsx`
- Modify: `src/features/settings/settings.css`
- Modify: `src/components/SegmentedControl.tsx`

**Interfaces:**
- Produces: five settings tabs and connection-test/data lifecycle controls.
- Consumes: runtime settings CRUD, backup/import, internal Dialog and NotificationCenter.

- [ ] **Step 1: Write failing settings tests**

Cover: inline validation of missing Base URL/model; API key show/hide; secondary API disabled by default; exactly six default tags; successful connection-test notification; failed test shows cause and recovery; backup omits the key; clear-data opens internal confirmation.

- [ ] **Step 2: Run settings tests and confirm RED**

Run: `pnpm vitest run src/features/settings/TavernSettings.test.tsx`

Expected: FAIL because tavern settings panels are absent.

- [ ] **Step 3: Implement connection and parsing forms**

Normalize Base URL by trimming only trailing slashes. Validate on blur. Never echo the API key in error text. Custom tags must contain `maintext` and `option`; restoring defaults writes all six tags.

- [ ] **Step 4: Implement backup, restore and clear-data flows**

Export a versioned JSON file. Import validates version and lists entity counts before applying. Clearing chats preserves characters/lorebooks/presets/settings; restoring defaults is a separate confirmation.

- [ ] **Step 5: Run GREEN and publish Task 8**

Run: `pnpm vitest run src/features/settings src/sillytavern/backup.test.ts && pnpm typecheck && pnpm build`

Commit: `feat: add Tavern connection and data settings`

Push: `git push origin HEAD:main`

---

### Task 9: 强化会话分支、行动记录和全局运行状态

**Files:**
- Create: `src/features/log/SessionBranchTree.tsx`
- Create: `src/features/log/SessionBranchTree.test.tsx`
- Modify: `src/features/log/LogPage.tsx`
- Modify: `src/features/log/log.css`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/AppShell.test.tsx`
- Modify: `src/components/NotificationCenter.tsx`

**Interfaces:**
- Produces: session branch tree, model/character/preset status in top bar and deep-link history navigation.
- Consumes: TavernRuntime session graph and source provenance from Task 7.

- [ ] **Step 1: Write failing branch-tree and shell tests**

Assert that a child session renders beneath its parent with the exact fork turn, loading it updates the top bar, and a deep-link request focuses the source message. Assert model state includes visible text as well as color/icon.

- [ ] **Step 2: Run tests and confirm RED**

Run: `pnpm vitest run src/features/log/SessionBranchTree.test.tsx src/app/AppShell.test.tsx`

Expected: FAIL because the branch tree and tavern telemetry are missing.

- [ ] **Step 3: Implement branch tree and provenance navigation**

Use nested semantic lists, not an inaccessible canvas-only graph. Provide rename, load, branch, export and delete actions with unique IDs. Preserve LogPage's tactical timeline as a sibling tab.

- [ ] **Step 4: Add global runtime telemetry**

Top bar exposes 本地模拟/远程连接/生成中/中断/失败, current character and preset. The orchestrator button shows the active session name; small screens collapse details into one labeled button.

- [ ] **Step 5: Run GREEN and publish Task 9**

Run: `pnpm vitest run src/features/log src/app src/components && pnpm typecheck`

Commit: `feat: connect session branches to terminal shell`

Push: `git push origin HEAD:main`

---

### Task 10: 全面响应式、无障碍、性能与端到端验收

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/global.css`
- Modify: `src/styles/responsive.css`
- Modify: `src/test/accessibility.test.tsx`
- Modify: `src/test/uniqueIds.test.tsx`
- Modify: `src/test/responsive-contract.test.ts`
- Modify: `e2e/core-flow.spec.ts`
- Create: `e2e/tavern-runtime.spec.ts`
- Create: `e2e/tavern-management.spec.ts`
- Modify: `e2e/responsive.spec.ts`
- Modify: `README.md`
- Create: `docs/verification/2026-08-29-sillytavern-integration-audit.md`

**Interfaces:**
- Produces: full requirement evidence and user-facing run/configuration documentation.
- Consumes: all previous tasks.

- [ ] **Step 1: Extend failing global contract tests**

Add tests that render every route plus the orchestrator and all dialogs, then assert no duplicate IDs, no unlabeled icon button, every field has an associated label, no structural emoji, and reduced-motion disables transform-based entrance animation.

- [ ] **Step 2: Run global tests and confirm RED where gaps remain**

Run: `pnpm vitest run src/test`

Expected: FAIL on at least the newly introduced contract gap before the corresponding production fix.

- [ ] **Step 3: Fix accessibility, responsive and motion gaps**

Use semantic tokens for all new colors; enforce 44px touch targets below 768px; move secondary panes into drawers; ensure `overflow-wrap: anywhere` only for IDs/URLs/user tokens; retain visible focus and route-change focus management.

- [ ] **Step 4: Write E2E flows before final behavior fixes**

`tavern-runtime.spec.ts` covers bootstrap → create session → select option → complete local turn → refresh → restored message/variables → branch. `tavern-management.spec.ts` covers character card, worldbook and preset JSON import/export plus settings validation. Browser download assertions verify filenames and valid JSON.

- [ ] **Step 5: Run E2E RED and implement remaining behavior**

Run: `pnpm playwright test e2e/tavern-runtime.spec.ts e2e/tavern-management.spec.ts`

Expected: initially FAIL at any incomplete integration boundary; apply the smallest production correction for each observed failure, then rerun until PASS.

- [ ] **Step 6: Run the complete automated gate**

Run: `pnpm test && pnpm typecheck && pnpm build && pnpm test:e2e`

Expected: all Vitest suites PASS, TypeScript exits 0, Vite build exits 0, and all Playwright projects PASS without console errors.

- [ ] **Step 7: Perform browser visual verification**

Inspect `/operation`, `/memory`, `/operators`, `/archive`, `/log`, `/settings` and the orchestrator at 1440×900, 1024×768, 768×1024 and 375×812. Verify streaming motion and reduced-motion, focus restoration, modal scrims, line length, touch targets, no horizontal overflow, and the absence of native alerts.

- [ ] **Step 8: Record requirement-by-requirement evidence**

Write `docs/verification/2026-08-29-sillytavern-integration-audit.md` mapping every item in spec section 13 and the skill Verification checklist to exact tests, command outputs and browser observations. Do not mark an item complete when evidence is indirect.

- [ ] **Step 9: Publish the completed integration**

Commit: `test: verify SillyTavern tactical integration`

Push: `git push origin HEAD:main`

Verify: `git status --short --branch` is clean and `git ls-remote --heads origin main` equals local `git rev-parse HEAD`.
