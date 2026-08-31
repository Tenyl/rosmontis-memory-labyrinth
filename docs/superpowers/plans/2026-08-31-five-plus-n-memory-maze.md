# 5+N 层疗愈型记忆迷宫 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前三层原型重构为可离线通关五层、接入 LLM 后可安全进入第六层及以后“无垠心海”的单主角疗愈型肉鸽。

**Architecture:** 使用单一组合式 Zustand 根仓库承载跨域原子事务，以领域 Slice 和纯规则模块拆分 Run、拓扑、迷迭香、碎片、手记与 LLM 职责。所有数值和拓扑由本地规则决定，LLM 输出只能进入经 Schema 校验的叙事记录。

**Tech Stack:** React 19、TypeScript、Zustand 5、Dexie 4、Vitest 4、Testing Library、Playwright、Vite、Lucide React。

**Spec:** `docs/superpowers/specs/2026-08-31-five-plus-n-memory-maze-design.md`

## Global Constraints

- 可玩主角始终只有迷迭香，玩家身份不得进入肉鸽队伍状态。
- 第 1—5 层必须完全离线可通关；第 6+ 层只在第五层通关且 LLM 启用后开放。
- LLM 不得直接写入数值、节点类型、边、奖励、胜负或 Run 阶段。
- 游戏内阻断使用迷迭香第一人称文案；技术设置错误保留精确诊断。
- 人物、立绘、插图、语音、音乐全部使用 `assets` 注册项和空白占位。
- 新核心交互必须具有全局唯一、描述性的 `id`。
- 动效必须支持减少动效；可见文案不得含 Emoji。
- 每项完成后运行相关测试和类型检查，提交并推送当前分支。

---

### Task 1: 固化领域契约与五层目录

**Files:**
- Create: `src/game/floors.ts`
- Create: `src/game/floors.test.ts`
- Modify: `src/game/types.ts`
- Modify: `src/game/maze.ts`
- Modify: `src/game/maze.test.ts`
- Modify: `src/llm/localNovelBlueprint.ts`
- Modify: `src/llm/gameContent.ts`

**Interfaces:**
- Produces: `MazeNodeType`, `OverloadBand`, `MemoryFragmentKind`, `RunEra`, `FloorDefinition`。
- Produces: `STANDARD_FLOORS`, `getFloorDefinition(floor)`, `getRunEra(floor)`。
- Produces: `generateMaze(input)` 支持八类节点、五层 Boss 和 9—13 个节点。

- [ ] **Step 1: 写失败的楼层目录与节点枚举测试**

```ts
expect(STANDARD_FLOORS.map((floor) => floor.title)).toEqual([
  '表层残响', '雨幕病区', '冰冷实验室', '心防回廊', '核心花房',
]);
expect(getFloorDefinition(5).bossKind).toBe('closed-heart');
expect(getRunEra(6)).toBe('boundless-mindsea');
```

- [ ] **Step 2: 写失败的五层拓扑不变量测试**

```ts
for (let floor = 1; floor <= 5; floor += 1) {
  const graph = generateMaze({ seed: 'FIVE-FLOOR', mode: 'preset', floor, maxFloor: 5, targetNodeCount: 11 });
  expect(graph.nodes.at(-1)?.type).toBe('boss');
  expect(validateMaze(graph)).toEqual({ valid: true, issues: [] });
  expect(getReachableNodeIds(graph, graph.startNodeId).has(graph.coreNodeId)).toBe(true);
}
```

- [ ] **Step 3: 运行测试并确认旧枚举/三层出口逻辑导致失败**

Run: `npm test -- src/game/floors.test.ts src/game/maze.test.ts`

Expected: FAIL，提示 `floors.ts` 不存在或前四层出口不是 Boss。

- [ ] **Step 4: 实现楼层目录和新节点类型**

```ts
export const STANDARD_FLOORS: readonly FloorDefinition[] = [
  { floor: 1, title: '表层残响', era: 'trauma-recovery', bossKind: 'gatekeeper', requiredNodeTypes: ['combat', 'safehouse', 'shop', 'encounter', 'unknown'], targetNodeRange: [9, 11] },
  { floor: 2, title: '雨幕病区', era: 'trauma-recovery', bossKind: 'gatekeeper', requiredNodeTypes: ['combat', 'emergency-combat', 'safehouse', 'shop', 'encounter', 'dilemma', 'unknown'], targetNodeRange: [10, 12] },
  { floor: 3, title: '冰冷实验室', era: 'trauma-recovery', bossKind: 'gatekeeper', requiredNodeTypes: ['combat', 'emergency-combat', 'safehouse', 'shop', 'encounter', 'dilemma', 'unknown'], targetNodeRange: [10, 13] },
  { floor: 4, title: '心防回廊', era: 'trauma-recovery', bossKind: 'gatekeeper', requiredNodeTypes: ['combat', 'emergency-combat', 'safehouse', 'shop', 'encounter', 'dilemma', 'unknown'], targetNodeRange: [11, 13] },
  { floor: 5, title: '核心花房', era: 'trauma-recovery', bossKind: 'closed-heart', requiredNodeTypes: ['combat', 'emergency-combat', 'safehouse', 'shop', 'encounter', 'dilemma', 'unknown'], targetNodeRange: [11, 13] },
];
```

- [ ] **Step 5: 重构拓扑生成和校验**

实现有向无环分列拓扑、入口安全屋、每层 Boss、无意外死路、至少一条可达出口路线和保守模板回退；同步 LLM 节点白名单。

- [ ] **Step 6: 运行规则测试和类型检查**

Run: `npm test -- src/game/floors.test.ts src/game/maze.test.ts src/llm/gameContent.test.ts src/llm/localNovelBlueprint.test.ts`

Run: `npm run typecheck`

Expected: PASS。

- [ ] **Step 7: 提交并推送**

```bash
git add src/game/floors.ts src/game/floors.test.ts src/game/types.ts src/game/maze.ts src/game/maze.test.ts src/llm/localNovelBlueprint.ts src/llm/gameContent.ts
git commit -m "feat: add five-floor maze contracts"
git push origin codex/rosemary-memory-maze
```

### Task 2: 拆分组合式状态 Slice 并升级存档 V6

**Files:**
- Create: `src/store/slices/runSlice.ts`
- Create: `src/store/slices/mazeSlice.ts`
- Create: `src/store/slices/rosmontisSlice.ts`
- Create: `src/store/slices/inventorySlice.ts`
- Create: `src/store/slices/diarySlice.ts`
- Create: `src/store/slices/llmDirectorSlice.ts`
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/gameStateMigration.ts`
- Modify: `src/store/gameStateMigration.test.ts`
- Modify: `src/data/demoData.ts`

**Interfaces:**
- Produces: `createRunSlice`, `createMazeSlice`, `createRosmontisSlice`, `createInventorySlice`, `createDiarySlice`, `createLlmDirectorSlice`。
- Produces: 根 Store 的事务入口 `dispatchRunAction(action: RunAction): RunResolution`。
- Consumes: Task 1 的节点和楼层契约。

- [ ] **Step 1: 写 V5→V6 迁移失败测试**

```ts
expect(migrateGameState(v5State, defaults).run.maxFloor).toBe(5);
expect(migrateGameState(v5State, defaults).maze.nodes[0]?.type).toBe('safehouse');
expect(migrateGameState(v5State, defaults).ui.migrationNotice).toBe('three-to-five-floors');
```

- [ ] **Step 2: 写跨 Slice 原子结算失败测试**

一次移动后同时断言 Run 回合、当前节点、AP 刷新、规则日志和待遭遇均更新；任何拒绝结果不得部分写入。

- [ ] **Step 3: 运行 Store 测试确认失败**

Run: `npm test -- src/store/gameStateMigration.test.ts src/store/gameStore.test.ts`

- [ ] **Step 4: 提取领域 Slice**

每个 Slice 只声明自身状态和局部 Action；跨域移动、遭遇、奖励、失败判断保留在根 Store 的 `dispatchRunAction` 中一次性提交。

- [ ] **Step 5: 实现 V6 迁移**

迁移保留 progression、memoryCompendium、runHistory、archive、UI 偏好和 Tavern 投影；活动旧 Run 使用相同种子重建五层 Run，并写一次迁移通知。

- [ ] **Step 6: 运行 Store、迁移和类型检查**

Run: `npm test -- src/store/gameStateMigration.test.ts src/store/gameStore.test.ts`

Run: `npm run typecheck`

- [ ] **Step 7: 提交并推送**

```bash
git add src/store src/data/demoData.ts
git commit -m "refactor: split game state into domain slices"
git push origin codex/rosemary-memory-maze
```

### Task 3: 建立统一遭遇协议和八类节点

**Files:**
- Create: `src/game/encounterProtocol.ts`
- Create: `src/game/encounterProtocol.test.ts`
- Create: `src/game/nodeCatalog.ts`
- Create: `src/game/nodeCatalog.test.ts`
- Modify: `src/game/encounters.ts`
- Modify: `src/game/encounters.test.ts`
- Modify: `src/game/run.ts`
- Modify: `src/game/presetEvents.ts`

**Interfaces:**
- Produces: `EncounterAction`, `EncounterResolution`, `resolveEncounterAction(state, action)`。
- Produces: `NODE_CATALOG` 和 `getNodeDefinition(type)`。
- Consumes: Task 1 的八类节点、Task 2 的事务入口。

- [ ] **Step 1: 写紧急作战和命运抉择失败测试**

断言紧急作战具有高护盾/过载词条和高阶奖励；命运抉择必须把代价和收益写入同一结构化事件。

- [ ] **Step 2: 写巨剑卡直接结算遭遇的失败测试**

```ts
const result = resolveEncounterAction(state, { type: 'play-sword', swordId: 'breach' });
expect(result.state.pendingEncounter?.enemyIntegrity).toBe(50);
expect(result.animation).toBe('breach');
```

- [ ] **Step 3: 运行测试确认当前双系统失败**

Run: `npm test -- src/game/encounterProtocol.test.ts src/game/encounters.test.ts`

- [ ] **Step 4: 实现节点目录和统一动作协议**

把战斗/未知/Boss 巨剑行动、休息/商店/抉择选择、购买/出售/离开全部路由到 `resolveEncounterAction`；删除绕过协议的重复数值路径。

- [ ] **Step 5: 同步 Run reducer 和规则事件**

每个接受的动作产生结构化事件；拒绝动作返回第一人称 `RosmontisMessage` 且不改变快照。

- [ ] **Step 6: 运行规则回归测试**

Run: `npm test -- src/game/encounterProtocol.test.ts src/game/encounters.test.ts src/game/run.test.ts src/game/presetEvents.test.ts`

Run: `npm run typecheck`

- [ ] **Step 7: 提交并推送**

```bash
git add src/game
git commit -m "feat: unify node encounters and sword actions"
git push origin codex/rosemary-memory-maze
```

### Task 4: 实现过载、暴走、安抚和四柄巨剑新词条

**Files:**
- Create: `src/game/overload.ts`
- Create: `src/game/overload.test.ts`
- Modify: `src/game/greatswords.ts`
- Modify: `src/game/greatswords.test.ts`
- Modify: `src/game/encounterProtocol.ts`
- Modify: `src/game/types.ts`

**Interfaces:**
- Produces: `getOverloadBand(overload)`, `applyBerserkDamage(base, overload)`。
- Produces: `resolveComfortAction(state, gesture)`。
- Produces: 新巨剑展示名与本地效果配置。

- [ ] **Step 1: 写阈值表失败测试**

```ts
expect([69, 70, 79, 80, 99, 100].map(getOverloadBand)).toEqual([
  'normal', 'warning', 'warning', 'berserk', 'berserk', 'collapse',
]);
```

- [ ] **Step 2: 写暴走倍率、操作限制和反噬失败测试**

断言 80% 过载时立柱伤害为基础值两倍、探针动作被拒绝、攻击后扣除稳定性。

- [ ] **Step 3: 写安抚动作失败测试**

断言轻触额头消耗 1 AP/降低 8 过载，握住手消耗 2 AP/暴走时降低 18 过载，AP 不足时状态不变。

- [ ] **Step 4: 实现统一过载函数和新巨剑配置**

所有 UI/规则阈值改为调用 `getOverloadBand`；四柄剑词条统一为立柱/破壁、门扉/守望、探针/认知、哀鸣/共鸣。

- [ ] **Step 5: 运行测试和类型检查**

Run: `npm test -- src/game/overload.test.ts src/game/greatswords.test.ts src/game/encounterProtocol.test.ts`

Run: `npm run typecheck`

- [ ] **Step 6: 提交并推送**

```bash
git add src/game
git commit -m "feat: add berserk and comfort state machine"
git push origin codex/rosemary-memory-maze
```

### Task 5: 重构三类碎片和手记抄录

**Files:**
- Create: `src/game/fragmentCatalog.ts`
- Create: `src/game/fragmentCatalog.test.ts`
- Modify: `src/game/fragments.ts`
- Modify: `src/game/fragments.test.ts`
- Modify: `src/game/types.ts`
- Modify: `src/features/operation/FragmentOverflowDialog.tsx`
- Modify: `src/features/operation/FragmentOverflowDialog.test.tsx`
- Modify: `src/assets/assetRegistry.ts`

**Interfaces:**
- Produces: `FRAGMENT_EFFECTS`, `applyFragmentEffects(context)`。
- Produces: `FragmentOverflowChoice` 新分支 `{ type: 'transcribe-and-replace'; fragmentId: string }`。
- Produces: `DiaryDraft`，交给 Task 6 持久化。

- [ ] **Step 1: 写三类碎片被动失败测试**

分别覆盖情感恢复、痛苦增伤/过载、技能 AP/冷却/侦测修正；效果 ID 必须来自本地目录。

- [ ] **Step 2: 写溢出抄录失败测试**

断言抄录后新碎片进入槽位、旧碎片离开局内背包、返回包含旧碎片叙事的 `DiaryDraft`，核心碎片仍不可替换。

- [ ] **Step 3: 运行测试确认失败**

Run: `npm test -- src/game/fragmentCatalog.test.ts src/game/fragments.test.ts src/features/operation/FragmentOverflowDialog.test.tsx`

- [ ] **Step 4: 实现目录、效果和人格化溢出界面**

弹窗主文案使用“博士……我的脑子好胀……”；三个选择均提供明确后果和唯一 ID。

- [ ] **Step 5: 运行测试、唯一 ID 和类型检查**

Run: `npm test -- src/game/fragmentCatalog.test.ts src/game/fragments.test.ts src/features/operation/FragmentOverflowDialog.test.tsx src/test/uniqueIds.test.tsx`

Run: `npm run typecheck`

- [ ] **Step 6: 提交并推送**

```bash
git add src/game src/features/operation/FragmentOverflowDialog.tsx src/features/operation/FragmentOverflowDialog.test.tsx src/assets/assetRegistry.ts
git commit -m "feat: add typed memory fragments and diary transcription"
git push origin codex/rosemary-memory-maze
```

### Task 6: 新增 IndexedDB 手记簿与博士批注

**Files:**
- Modify: `src/sillytavern/database.ts`
- Modify: `src/sillytavern/backup.ts`
- Modify: `src/sillytavern/backup.test.ts`
- Create: `src/diary/types.ts`
- Create: `src/diary/repository.ts`
- Create: `src/diary/repository.test.ts`
- Create: `src/diary/localDiary.ts`
- Create: `src/diary/localDiary.test.ts`
- Create: `src/features/diary/DiaryPanel.tsx`
- Create: `src/features/diary/DiaryPanel.test.tsx`
- Create: `src/features/diary/diary.css`
- Modify: `src/features/archive/ArchivePage.tsx`

**Interfaces:**
- Produces: `listDiaryEntries`, `saveDiaryEntry`, `updateDoctorNote`。
- Produces: `createLocalDiaryDraft(trigger, snapshot)`，关键节点和每层完成时始终可用。
- Produces: `DiaryPanel` 作为记忆图鉴的新工作区。
- Consumes: Task 5 的 `DiaryDraft`。

- [ ] **Step 1: 写数据库 V5 与仓库失败测试**

断言升级保留现有会话/世界书/预设并创建 `diaryEntries`；保存批注后再次读取一致。

- [ ] **Step 2: 写备份包含手记但排除密钥的失败测试**

备份中断言 `diaryEntries` 存在，主/次 API Key 均为空。

- [ ] **Step 3: 写手记面板失败测试**

覆盖列表、空态、打开详情、保存博士批注、插图占位和来源标签。

- [ ] **Step 4: 写本地自动手记失败测试**

完成守门 Boss、完成每层和抄录碎片分别生成稳定 ID 的 `DiaryDraft`；重复触发不得产生重复条目，正文使用迷迭香第一人称。

- [ ] **Step 5: 实现 Dexie V5、仓库、本地生成器、备份与界面**

手记写入失败时保留 `pendingDiaryDrafts` 并显示技术诊断，不回滚已经完成的节点结算。

- [ ] **Step 6: 运行数据库、组件和类型检查**

Run: `npm test -- src/diary/repository.test.ts src/diary/localDiary.test.ts src/sillytavern/backup.test.ts src/features/diary/DiaryPanel.test.tsx`

Run: `npm run typecheck`

- [ ] **Step 7: 提交并推送**

```bash
git add src/sillytavern src/diary src/features/diary src/features/archive/ArchivePage.tsx
git commit -m "feat: add persistent Rosmontis diary"
git push origin codex/rosemary-memory-maze
```

### Task 7: 用战术卡重构遭遇 UI 和五层 Boss

**Files:**
- Modify: `src/features/operation/GreatswordActions.tsx`
- Modify: `src/features/operation/GreatswordActions.test.tsx`
- Modify: `src/features/operation/EncounterPanel.tsx`
- Modify: `src/features/operation/EncounterPanel.test.tsx`
- Create: `src/features/operation/BossEncounter.tsx`
- Create: `src/features/operation/BossEncounter.test.tsx`
- Create: `src/game/bosses.ts`
- Create: `src/game/bosses.test.ts`
- Modify: `src/features/operation/OperationPage.tsx`
- Modify: `src/features/operation/operation.css`

**Interfaces:**
- Produces: `BOSS_CATALOG`, `resolveBossAction`。
- `GreatswordActions` 消费当前 `PendingEncounter` 并调用统一 `onAction(EncounterAction)`。
- `EncounterPanel` 不再渲染战斗/Boss 的重复纯文本操作。

- [ ] **Step 1: 写第 1—4 层守门 Boss 和第 5 层双阶段失败测试**

断言第 5 层阶段二拒绝立柱、允许哀鸣和握手、共鸣 100 后胜利；第 1—4 层完成后进入下一层。

- [ ] **Step 2: 写组件联动失败测试**

点击立柱卡后同一遭遇面板的防护值变化并显示破壁动画；不再存在 `btn-encounter-boss-breach` 重复按钮。

- [ ] **Step 3: 实现 Boss 目录、状态机和统一卡片 UI**

卡片同时展示 AP、冷却、过载、本层探索充能和当前阶段禁用原因；拖拽作为增强，点击和键盘保持完整功能。

- [ ] **Step 4: 运行规则、组件、可访问性和类型检查**

Run: `npm test -- src/game/bosses.test.ts src/features/operation/GreatswordActions.test.tsx src/features/operation/EncounterPanel.test.tsx src/features/operation/BossEncounter.test.tsx src/test/accessibility.test.tsx`

Run: `npm run typecheck`

- [ ] **Step 5: 提交并推送**

```bash
git add src/game/bosses.ts src/game/bosses.test.ts src/features/operation
git commit -m "feat: make sword cards drive encounters and bosses"
git push origin codex/rosemary-memory-maze
```

### Task 8: 增加陪伴栏与人格化游戏反馈

**Files:**
- Create: `src/features/operation/CompanionInteractionBar.tsx`
- Create: `src/features/operation/CompanionInteractionBar.test.tsx`
- Create: `src/game/rosmontisMessages.ts`
- Create: `src/game/rosmontisMessages.test.ts`
- Modify: `src/features/operation/OperationPage.tsx`
- Modify: `src/features/memory/NodeIntelPanel.tsx`
- Modify: `src/features/operation/RunStatusBar.tsx`
- Modify: `src/features/operation/operation.css`

**Interfaces:**
- Produces: `getRosmontisMessage(context)` 本地确定性文案。
- `CompanionInteractionBar` 调用 `{ type: 'comfort' }` 统一动作。

- [ ] **Step 1: 写状态矩阵和按钮失败测试**

覆盖正常、警戒、暴走、低稳定性、Boss 第二阶段；断言“轻触额头”和“握住手”具有唯一 ID、AP 说明和即时反馈。

- [ ] **Step 2: 写游戏阻断人格化测试**

节点未完成、碎片溢出、高过载、非法 Boss 卡返回第一人称文案；API/JSON 设置错误不经过该转换器。

- [ ] **Step 3: 实现本地文案矩阵、打字机反馈和资源音频槽**

音频缺失时不渲染自动播放元素；远程台词只能替换显示文本。

- [ ] **Step 4: 运行组件和类型检查**

Run: `npm test -- src/game/rosmontisMessages.test.ts src/features/operation/CompanionInteractionBar.test.tsx src/features/memory/NodeIntelPanel.test.tsx`

Run: `npm run typecheck`

- [ ] **Step 5: 提交并推送**

```bash
git add src/game/rosmontisMessages.ts src/game/rosmontisMessages.test.ts src/features/operation src/features/memory/NodeIntelPanel.tsx
git commit -m "feat: add companion interactions and character feedback"
git push origin codex/rosemary-memory-maze
```

### Task 9: 实现分层 Prompt、严格 Schema 和第 6+ 层

**Files:**
- Create: `src/llm/schemas/eventV2.ts`
- Create: `src/llm/schemas/diaryV1.ts`
- Create: `src/llm/schemas/mindseaFloorV1.ts`
- Create: `src/llm/mindseaBlueprint.ts`
- Create: `src/llm/mindseaBlueprint.test.ts`
- Modify: `src/llm/gamePrompts.ts`
- Modify: `src/llm/gamePrompts.test.ts`
- Modify: `src/llm/gameContentClient.ts`
- Modify: `src/llm/gameContentClient.test.ts`
- Modify: `src/features/operation/NovelRunDirector.tsx`
- Create: `src/features/operation/DiaryDirector.tsx`
- Create: `src/features/operation/DiaryDirector.test.tsx`
- Modify: `src/features/memory/NovelMazeBrief.tsx`
- Modify: `src/game/run.ts`

**Interfaces:**
- Produces: `parseEventV2`, `parseDiaryV1`, `parseMindseaFloorV1`。
- Produces: `createFallbackMindseaBlueprint(seed, floor, fragments)`。
- Produces: `continueToMindsea(llmEnabled)` Run Action。
- Produces: `DiaryDirector`，消费稳定手记触发键并在远程失败时调用 `createLocalDiaryDraft`。

- [ ] **Step 1: 写 Prompt 分层失败测试**

第 1—5 层断言包含创伤疗愈边界；第 6+ 层包含完全态同伴设定和当前装载碎片，但不包含允许模型改数值的指令。

- [ ] **Step 2: 写 Schema 和白名单失败测试**

拒绝错误节点 ID、未知节点类型、少于 2/多于 3 个选项、越界 D20 阈值和非白名单意图。

- [ ] **Step 3: 写超时、取消、幂等和回退失败测试**

畸形 JSON、网络错误、超时均返回分类错误；相同触发键只提交一次；本地 Run 快照保持不变。

- [ ] **Step 4: 写远程手记与本地回退失败测试**

关键节点和每层完成时只请求一次 `diary-v1`；合法结果写入同一手记条目，超时或畸形结果使用 Task 6 的本地手记且不回滚节点。

- [ ] **Step 5: 实现 6+ 本地拓扑、远程叙事蓝图与手记 Director**

本地先生成合法 `mindsea-exit` 图，再请求远程主题；失败时接受确定性本地蓝图并允许继续。

- [ ] **Step 6: 运行 LLM、Run、手记和类型检查**

Run: `npm test -- src/llm src/game/run.test.ts src/features/operation/NovelRunDirector.test.tsx src/features/operation/DiaryDirector.test.tsx src/features/memory/NovelMazeBrief.test.tsx`

Run: `npm run typecheck`

- [ ] **Step 7: 提交并推送**

```bash
git add src/llm src/game/run.ts src/game/run.test.ts src/features/operation/NovelRunDirector.tsx src/features/memory/NovelMazeBrief.tsx
git commit -m "feat: add validated boundless mindsea generation"
git push origin codex/rosemary-memory-maze
```

### Task 10: 迁移 Lucide、过载视觉和二创声明

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: all files importing `@phosphor-icons/react`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/app-shell.css`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/global.css`
- Modify: `src/styles/responsive.css`
- Modify: `src/features/settings/SettingsPage.tsx`
- Modify: `src/features/settings/settings.css`
- Modify: `src/test/accessibility.test.tsx`
- Modify: `src/test/responsive-contract.test.ts`
- Create: `src/test/noEmoji.test.ts`

**Interfaces:**
- Root DOM exposes `data-overload-band`。
- Global shell and settings expose the exact disclaimer copy from the spec。

- [ ] **Step 1: 安装 Lucide 并写失败的依赖/Emoji/声明测试**

Run: `npm install lucide-react && npm uninstall @phosphor-icons/react`

测试断言源码无 Phosphor import、可见文案无 Emoji、声明在全局壳和设置页各出现一次。

- [ ] **Step 2: 分模块迁移图标**

使用 Lucide 语义等价图标，统一 `size={18}`、默认 `strokeWidth={1.8}`，仅状态主图标允许 20—24。

- [ ] **Step 3: 实现 PRTS 视觉和暴走降级**

加入深色毛玻璃、科技网格、`#68D8D6` token、80+ 边缘光晕/CRT/色散；减少动效时停用动画和位移。

- [ ] **Step 4: 运行全组件、可访问性、响应式、构建**

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run build`

- [ ] **Step 5: 提交并推送**

```bash
git add package.json package-lock.json src
git commit -m "feat: complete PRTS visual and icon migration"
git push origin codex/rosemary-memory-maze
```

### Task 11: 完成离线/LLM 端到端验收与交付审查

**Files:**
- Create: `e2e/five-floor-offline.spec.ts`
- Create: `e2e/mindsea-llm.spec.ts`
- Create: `e2e/llm-fallback.spec.ts`
- Modify: `playwright.config.ts`
- Create: `docs/verification/2026-08-31-five-plus-n-memory-maze-audit.md`

**Interfaces:**
- Consumes: Tasks 1—10 的完整用户流程。
- Produces: 可复现的最终验收证据。

- [ ] **Step 1: 写离线五层 Playwright 测试**

从新种子开始，按可达路线完成每层遭遇和 Boss，断言第五层完成、核心碎片入库、本地无尽解锁、无 page error/console warning。

- [ ] **Step 2: 写第 6 层和远程失败测试**

使用受控假 API 分别返回合法蓝图和畸形 JSON；断言合法时进入第 6 层，畸形时显示本地回退且 Run 可继续。

- [ ] **Step 3: 执行完整验证**

Run: `npm test`

Run: `npm run typecheck`

Run: `npm run build`

Run: `npm run test:e2e`

Expected: 全部 PASS，无未处理页面错误和控制台告警。

- [ ] **Step 4: 完成审计文档**

逐条记录五层离线、八类节点、暴走、安抚、碎片、手记、Boss、6+ LLM、回退、图标、Emoji、声明、资源占位、唯一 ID、动效降级和性能证据。

- [ ] **Step 5: 提交并推送**

```bash
git add e2e playwright.config.ts docs/verification/2026-08-31-five-plus-n-memory-maze-audit.md
git commit -m "test: verify five-plus-n memory maze"
git push origin codex/rosemary-memory-maze
```

- [ ] **Step 6: 对照设计规格完成最终审计**

只有设计规格第 14 节的每项证据都存在且通过时，才允许把 Goal 标记为完成。
