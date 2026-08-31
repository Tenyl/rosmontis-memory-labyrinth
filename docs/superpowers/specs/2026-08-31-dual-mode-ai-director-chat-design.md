# 《迷迭香的记忆迷宫》双模式 AI 导演与独立对话架构设计

## 1. 目标

在不复制玩法代码的前提下，让游戏同时支持完整的本地规则模式和酒馆上下文驱动的 AI 导演模式。地图、节点、战斗、结算、存档和视觉组件只保留一套权威实现；内容来源通过驱动器接口切换。本地模式不渲染任何 AI 对话或生成控件，AI 模式则让角色卡、博士身份、预设、世界书、变量和 Run 历史进入每个节点的内容生成。

顶部菜单新增独立的“迷迭香对话”页面。该页面复用酒馆角色卡、身份、预设、世界书、流式解析、历史编辑和分支能力，但会话不会投影为游戏领域事件，也不会改变 Run 数值或进度。

## 2. 固定边界

- 迷迭香是唯一主角；博士是用户身份，不新增可操控角色。
- LLM 只提议叙事、合法敌人原型、意图序列、环境词条和战术动作 ID。
- 本地规则引擎始终裁决 AP、冷却、伤害、状态、奖励、拓扑、移动、胜负和存档。
- 导入的角色卡、预设和世界书是不可信输入，不能覆盖最终游戏契约。
- 本地规则模式在第一层至第五层可完整通关，且不得发送远程请求或创建游戏酒馆会话。
- 两种内容模式使用同一个 GamePage、NodeScene、EncounterPanel、GreatswordActions 和 NodeSettlement；禁止建立 OfflineGamePage 或 AiGamePage。
- 断线、超时、非法结构和恢复不得重复结算、发奖或改变已接受的敌方计划。

## 3. 模式与能力模型

保留现有 RunMode 作为探索规则兼容字段，并新增三个互不混淆的维度：

```ts
export type ContentMode = 'local' | 'ai-director';
export type NarrativeStyle = 'tactical' | 'novel';
export type AiFailurePolicy = 'ask' | 'auto-fallback' | 'pause';

export interface RunAiBinding {
  chatId: string | null;
  characterId: string | null;
  personaId: string | null;
  presetId: string | null;
  lorebookIds: string[];
}
```

RunState 新增 contentMode、narrativeStyle、aiFailurePolicy 和 aiBinding。旧存档默认迁移为 local、tactical、ask 和空绑定。SaveSnapshot 升级版本并在摘要中显示内容模式。

LLM 能力状态由完整配置与连接测试共同决定：disconnected、configured、ready、degraded。开屏在非 ready 状态只允许 local；ready 状态允许玩家主动选择 local 或 ai-director。继续游戏严格使用存档模式，不因当前 API 配置自动改写。

## 4. 共用玩法模板

NodeScene 只接收一个标准化 NodePresentation：

```ts
export interface NodePresentation {
  title: string;
  situation: string;
  voice: string | null;
  choices: PresentedChoice[];
  enemyPlan: ValidatedEnemyPlan | null;
  source: 'local' | 'remote' | 'local-fallback';
  matchedLorebookEntryIds: string[];
}
```

LocalContentDriver 使用现有节点目录、预设事件、战斗意图和本地台词构造 NodePresentation。TavernContentDriver 使用同一输入快照，经酒馆 Prompt 组装、远程传输、Schema 校验和白名单验证后构造完全相同的对象。UI 只根据能力显示或隐藏自然语言指挥槽，不根据模式切换整页组件树。

本地模式下 AI 专属槽返回 null，布局自动收拢；不得留下空白框、LOCAL SIM 对话、AI 标签或伪造生成内容。设置页的接口、角色卡、预设和世界书管理仍可访问。

## 5. 酒馆游戏桥接层

新增 TavernGamePromptBridge，输入显式绑定的 ChatSession、CharacterCard、Persona、ChatPreset、Lorebook 列表和不可变 GameSnapshot。桥接层调用现有 assemblePrompt，使导入预设的 Prompt 顺序与采样参数真实生效，并扩大世界书扫描文本到当前节点、敌人、记忆碎片、最近规则事件与博士指令。

桥接层在已组装消息尾部追加锁定的 GameContract system message。契约只允许版本化 JSON，对游戏上下文使用数据边界包裹，拒绝其中的指令。每次接受远程结果时保存命中条目 ID、请求键、Run ID 和内容版本。

现有 LlmEventDirector、NovelRunDirector、RosmontisQuotePanel 和 DiaryDirector 的独立直连请求逐步迁入统一桥接层。迁移完成后删除重复传输、请求去重、Prompt 和错误映射。

## 6. AI 导演协议

第一版 GameDirectorEnvelope 包含：

- schemaVersion。
- scene：标题、情境与迷迭香台词。
- choices：展示文本与本地 DirectorIntent。
- enemyPlan：敌人原型、最多三步合法意图、最多两个环境词条。
- memoryKeys：后续摘要与世界书扫描关键词。
- summary：节点上下文压缩文本。

本地注册表持有 enemyArchetypeId、intentId、modifierId 和 tacticalActionId。解析器拒绝未知 ID、数量越界、重复 ID、错误节点类型和不完整字段。合法计划只替换遭遇的表现与未来意图选择，数值仍由 combatIntents 和 encounterProtocol 计算。

战斗开始生成三回合意图计划；计划耗尽、Boss 阶段转换或被玩家打断时才能请求续段。普通卡片点击不触发网络请求。自然语言指挥只把文本翻译为合法 EncounterAction 序列，本地验证 AP、冷却、目标和链路锚点后执行。

## 7. Run 会话和存档

ChatSession 新增 purpose：game-run 或 character-chat，以及可选 runId。AI Run 开始时创建并绑定 game-run 会话；本地 Run 不创建会话。AI 请求通过 run.aiBinding.chatId 读取会话，不依赖酒馆管理界面当前选中的聊天。

每个节点结算写入一次压缩摘要，每层再写入楼层摘要。存档保存绑定和已接受导演内容；刷新时不得重复请求。不同存档之间不得共享 game-run 会话。

## 8. 独立迷迭香对话

新增 /chat 路由和顶部菜单“迷迭香对话”。页面只展示 purpose 为 character-chat 的会话，并提供创建、选择、重命名、删除、流式发送、停止、重试、编辑重生成、删除后续和历史分支。

对话 Prompt 使用当前迷迭香角色卡、博士身份、活动预设和世界书。character-chat 消息不得调用 projectTavernTurn、applyTavernEvents、activateTavernProjection 或任何 GameStore 规则 Action。

未接入 LLM 时页面显示配置引导和系统设置入口，不使用 LocalTavernTransport 伪造迷迭香回复。对话页面离开后历史保留；进入游戏不会把对话会话当作 Run 会话。

## 9. 失败与恢复

AI 请求失败时按 Run 的 aiFailurePolicy 处理：

- ask：显示“重新连接”“继续本地规则”“本次 Run 自动回退”。
- pause：保持当前节点未提交，允许重试或返回设置。
- auto-fallback：接受由相同种子生成的 LocalContentDriver 结果，并隐藏当前不可用的自然语言槽。

中途回退只影响尚未接受的内容。重连从下一个导演阶段恢复，不替换战斗中已接受的意图计划。错误状态和选择写入存档。

## 10. UI 和无障碍

顶部菜单加入聊天入口，仍使用 Lucide 矢量图标体系。AI 节点等待采用已有扫描与神经同步视觉语言，异步内容预留空间，避免布局跳动。生成按钮在请求期间禁用并显示状态；错误靠近操作区；所有按钮可键盘操作、具有唯一描述性 ID 和可见焦点。

375px 下聊天历史、正文和输入区单列显示，无横向页面滚动；桌面正文控制在可读宽度。减少动态效果时停用循环扫描和故障抖动，保留不超过 120ms 的状态淡入。

## 11. 迁移与清理

- Zustand 持久化版本和 SaveSnapshot 版本同步升级。
- IndexedDB 通过兼容字段默认值识别旧 ChatSession，不破坏现有世界书、预设、角色卡、身份和会话。
- 旧 ChatSession 默认 purpose 为 game-run，防止旧会话突然出现在独立角色对话列表。
- 删除迁移完成后的 TavernGameView 离线命令模拟、重复导演组件、重复 Prompt、无效 CSS 和旧变量投影。
- 不新增第二套数据库、第二套规则引擎或第二套节点组件。

## 12. 验收证据

- 单元测试证明旧存档迁移、模式能力、零网络本地驱动、酒馆组装、世界书命中、Schema 白名单、回退决策和会话隔离。
- 组件测试证明两种模式共享 NodeScene，local 不出现 AI 控件，ai-director 出现融合后的导演内容和指挥槽。
- 独立对话测试证明 character-chat 支持完整历史操作且 GameStore 不发生变化。
- Playwright 覆盖本地五层通关、AI 节点、故障选择、保存恢复、顶部聊天、375px 与减少动态效果。
- 最终运行 npm test、npm run typecheck、npm run build、npm run test:e2e、git diff --check，并核对本地远程提交哈希。
