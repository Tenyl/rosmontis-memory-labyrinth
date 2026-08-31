# 双模式 AI 导演与迷迭香对话验收记录

日期：2026-09-01  
分支：`codex/rosemary-memory-maze`

## 验收结论

本轮目标全部完成。本地规则模式与 AI 导演模式共用同一套 Run、迷宫、节点、遭遇、战术卡、结算与存档模板；AI 仅通过版本化内容协议提供叙事、合法选项 ID、环境词条和敌方意图计划，最终数值与进度仍由本地规则引擎原子结算。顶部“迷迭香对话”使用独立 `character-chat` 会话，不投影到游戏状态。

## 需求与证据

| 验收项 | 实现证据 | 自动化证据 |
| --- | --- | --- |
| 本地与 AI 共用游戏模板 | `GameDirectorBoundary` 向同一 `NodeScene` 提供 `NodePresentation`；`EncounterPanel`、战术卡和 `NodeSettlement` 无模式分叉 | `GamePage.test.tsx`、`GameDirectorBoundary.test.tsx`、`dual-mode-director.spec.ts` |
| 本地模式零 AI 交互与零请求 | 本地 `LocalContentDriver` 同步解析；不渲染导演状态、自然语言输入或生成槽 | `contentDriver.test.ts`、`GamePage.test.tsx`、`dual-mode-director.spec.ts`、`five-floor-offline.spec.ts` |
| 酒馆资料参与 AI 导演 | 绑定角色卡、博士身份、预设、启用世界书、变量、会话历史与 Run 摘要，经真实 `assemblePrompt` 组装；锁定契约始终最后注入 | `tavernGamePromptBridge.test.ts`、`core-flow.spec.ts`、`dual-mode-director.spec.ts` |
| AI 输出受本地裁决 | `gameDirectorV1` 与 `tacticalCommandV1` 拒绝未知字段、未知 ID、重复意图、直接数值和非法节点；战术动作通过本地 reducer 原子试运行 | Schema、`tacticalCommand.test.ts`、`encounterProtocol.test.ts`、`llm-fallback.spec.ts` |
| AI 故障决策 | 支持重试、本节点本地内容、本次潜入始终回退，并在 Tavern 初始化完成前保持加载态 | `GameDirectorBoundary.test.tsx`、`dual-mode-director.spec.ts` |
| 每存档独立 AI 会话 | `RunAiBinding` 固定 game-run 会话、角色、身份、预设和世界书；节点结算写入去重摘要；刷新复用已接受内容 | `TitlePage.test.tsx`、`NodeSettlement.test.tsx`、`core-flow.spec.ts`、`dual-mode-director.spec.ts` |
| 旧存档兼容 | Zustand 持久化与三个独立存档槽均经过统一迁移；合法的“节点已结算、等待选路”检查点不再被误判损坏 | `gameStateMigration.test.ts`、`saveSlots.test.ts`、`maze.test.ts`、`TitlePage.test.tsx` |
| 独立迷迭香对话 | 顶部 `/chat` 使用当前/会话绑定角色卡，支持流式生成、停止、重试、历史编辑重生成、分支、重命名与删除；无 LLM 时仅显示配置引导 | `RosmontisChatPage.test.tsx`、`rosmontis-chat.spec.ts` |
| 对话不影响游戏 | `character-chat` 会话跳过 GameStore 投影，和 `game-run` 会话按 purpose 隔离 | `tavern-runtime.test.tsx`、`RosmontisChatPage.test.tsx`、`rosmontis-chat.spec.ts` |
| 响应式与可访问操作 | 对话页使用统一 Dialog、唯一 ID、矢量图标与资源占位图；修复窄屏弹窗层级 | `uniqueIds.test.tsx`、`accessibility.test.tsx`、`responsive.spec.ts`、`visual-audit.spec.ts` |
| 第六层 AI 扩展 | 第五层通关后复用/建立绑定 game-run 会话生成无垠心海，并沿用历史摘要 | `NovelRunDirector.test.tsx`、`mindsea-llm.spec.ts` |

## 清理结果

- 删除旧 `eventV2` Schema、独立事件意图结算和 `llmDirector.event` 状态旁路。
- 删除此前已失去消费者的旧 AI 事件面板、旧 Tavern 游戏视图、离线伪指令和重复 Prompt/遥测组件。
- Boss 固定双阶段规则不再接收无法消费的敌方轮转计划。
- AI 选项与环境词条已经进入实际共享节点界面，不再只保存而不展示/执行。

## 最终验证

| 命令 | 结果 |
| --- | --- |
| `npm test` | 103 个测试文件、474 项测试全部通过 |
| `npm run typecheck` | 通过 |
| `npm run build` | Vite 生产构建通过，1979 个模块完成转换 |
| `npm run test:e2e` | Chromium 50/50 通过，包含离线五层、AI 回退、第六层、聊天、响应式与视觉审查 |
| `git diff --check` | 通过（仅 Git 的 LF/CRLF 提示，无空白错误） |

范围内无已知未解决问题。
