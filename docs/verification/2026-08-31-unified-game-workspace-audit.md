# 统一游戏工作区交付审计

审计日期：2026-08-31  
目标分支：`codex/rosemary-memory-maze`

| 需求 | 权威实现或测试 | 验证命令 | 结果 | 未解决问题 |
| --- | --- | --- | --- | --- |
| “作战主控台”与“意识战场”合并为单一路由，地图、状态、陪伴交互和节点内容同页呈现 | `src/features/game/GamePage.tsx`；`e2e/unified-game-workspace.spec.ts` | `npm run test:e2e` | 统一节点进出流程通过，全程保持 `/game` | 无 |
| 移除侧边栏，游戏外功能进入顶部菜单，页面标题固定为“迷迭香的记忆迷宫” | `src/app/AppShell.tsx`；`src/app/router.tsx`；`src/test/accessibility.test.tsx` | `npm test`、`npm run test:e2e` | 顶部菜单阅读顺序、唯一 ID、路由与标题均通过 | 无 |
| 地图具备动态拓扑、曲线路径、镜头控制、列表回退和直接节点进入 | `src/features/game/MazeStage.tsx`；`src/features/game/mazeLayout.ts`；`src/features/game/MazeStage.test.tsx` | `npm test`、`npm run test:e2e` | 图形与列表视图、路径限制和节点直接进入通过；修复拖拽层抢占节点指针 | 无 |
| 节点进入和返回使用主题转场，不发生跨页面跳转 | `src/features/game/NodeTransitionLayer.tsx`；`src/features/game/sceneState.ts`；`e2e/unified-game-workspace.spec.ts` | `npm test`、`npm run test:e2e` | 标准转场与焦点回落通过，URL 始终为 `/game` | 无 |
| 减少动态效果时禁用无限动画并快速完成转场 | `src/features/game/game.css`；`src/styles/global.css`；`e2e/responsive.spec.ts` | `npm run test:e2e` | 浏览器内场景时间戳确认转场小于 200ms，无无限动画 | 无 |
| 375、768、1024、1440 宽度无页面级横向溢出，移动端菜单和节点操作可用 | `src/app/app-shell.css`；`src/features/game/game.css`；`e2e/responsive.spec.ts` | `npm run test:e2e` | 四档视口、五条正式路由及设置管理面板全部通过 | 无 |
| 图鉴、手记、行动记录与设置拆分为明确顶部入口 | `src/features/compendium/CompendiumPage.tsx`；`src/features/diary/DiaryPage.tsx`；`src/features/records/RecordsPage.tsx`；`src/features/settings/SettingsPage.tsx` | `npm test`、`npm run test:e2e` | 五条正式路由均可访问且无水平溢出 | 无 |
| 世界书、生成预设和会话管理迁入设置，二级编辑器逐项分行 | `src/features/settings/SettingsPage.tsx`；`e2e/tavern-management.spec.ts` | `npm run test:e2e` | 导入导出、预设编辑器、世界书编辑器、会话树通过 | 无 |
| 清除叙事档案、战术时间线及旧版人物和标题残留 | V8 allowlist 迁移；`e2e/unified-game-workspace.spec.ts` | 生产源码残留 `rg` 扫描 | 指定旧词在 `src` 与 `index.html` 中零命中 | 无 |
| V8 存档仅保留当前架构字段，旧路由安全重定向 | `src/store/gameStateMigration.ts`；`src/app/router.tsx`；`src/store/gameStateMigration.test.ts` | `npm test`、`npm run test:e2e` | 旧字段迁移测试通过；`/operation`、`/memory`、`/operators` 均回到 `/game` | 无 |
| 无 API 时完整通过 1—5 层并覆盖八类节点与终局解锁 | `e2e/five-floor-offline.spec.ts`；`e2e/helpers/run.ts` | `npm run test:e2e` | 五层、八类节点、终局、图鉴、Run 历史和本地无尽解锁通过 | 无 |
| LLM 越权或格式异常时保持本地数值与拓扑 | `e2e/llm-fallback.spec.ts` | `npm run test:e2e` | 越权蓝图被拒绝并切换本地回退，Run 进度保持 | 无 |
| 首次通关并接入 LLM 后可进入第六层无垠心海 | `e2e/mindsea-llm.spec.ts` | `npm run test:e2e` | 第六层主题、人格 Prompt、远程只读节点附注通过 | 无 |
| 酒馆本地回合、刷新恢复、会话分支和内容管理保持可用 | `e2e/core-flow.spec.ts`；`e2e/tavern-runtime.spec.ts`；`e2e/tavern-management.spec.ts` | `npm run test:e2e` | 剧情生成、消息持久化、历史分支和导入导出通过 | 无 |
| 人物头像与立绘使用可替换空白占位资源 | `src/assets/assetRegistry.ts`；`src/components/CharacterArtwork.tsx`；`e2e/navigation-modals.spec.ts` | `npm test`、`npm run test:e2e` | 占位图可加载且未恢复旧随行档案入口 | 无 |
| 全局交互具有可访问名称、唯一描述性 ID 和稳定焦点 | `src/test/accessibility.test.tsx`；`src/test/interactive-source-ids.test.ts`；`src/test/uniqueIds.test.tsx` | `npm test` | 路由焦点、节点进入焦点、返回节点焦点与控件命名通过 | 无 |

## 最终验证矩阵

| 命令 | 结果 | 墙钟耗时 |
| --- | --- | --- |
| `npm test` | 94 个测试文件、439 项测试全部通过 | 20.57 秒 |
| `npm run typecheck` | TypeScript 工程检查通过 | 0.83 秒 |
| `npm run build` | Vite 生产构建通过，1970 个模块完成转换 | 0.78 秒 |
| `npm run test:e2e` | 10 个浏览器测试文件、43 项 Chromium 用例全部通过 | 317.26 秒 |
| `git diff --check` | 通过；仅显示 Git 的 LF/CRLF 工作区提示 | 小于 1 秒 |
| 生产残留 `rg` 扫描 | 零命中 | 小于 1 秒 |

Playwright 完整套件同时监听并约束关键流程中的浏览器控制台错误；视觉审查用例生成四组视口联络表并确认无运行时错误。
