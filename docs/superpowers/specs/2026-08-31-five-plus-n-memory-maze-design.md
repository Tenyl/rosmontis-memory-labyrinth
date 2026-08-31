# 《迷迭香的记忆迷宫》5+N 层疗愈型肉鸽重构设计

## 1. 目标

把当前三层、遭遇按钮与战术卡分离的原型，重构为一套可离线完整通关五层、接入 LLM 后可继续进入第六层及以后“无垠心海”的单主角疗愈型肉鸽。

规则、拓扑、奖励和胜负始终由本地纯函数决定；LLM 只生成经过严格验证的主题、叙事和内容提案。任何远程失败都不得损坏 Run、存档或已完成结算。

## 2. 当前基线

- React 19、TypeScript、Zustand、Dexie、Vitest、Playwright。
- `src/store/gameStore.ts` 是单一持久化 Store，存档版本为 5。
- `src/game/run.ts` 统筹三层 Run、移动、遭遇、碎片和终局。
- 节点类型为 `combat | rest | shop | wonder | unknown | boss`。
- 第三层才出现唯一 Boss；第一、二层出口是休息节点。
- 四柄巨剑卡与 `EncounterPanel` 使用两套结算状态，玩家容易误解。
- UI 使用 `@phosphor-icons/react`；目标要求统一迁移到 Lucide。
- 酒馆资料使用 IndexedDB V4，肉鸽状态使用 Zustand/localStorage。

## 3. 设计原则

1. **一个结算来源**：玩家动作只通过统一 `resolveEncounterAction` 进入规则引擎；UI 不自行拼接数值。
2. **跨域事务原子化**：保留一个组合式 Zustand 根仓库，以领域 Slice 拆分职责，避免多个独立 Store 在移动、奖励和失败判断时不同步。
3. **先离线、后叙事**：五层必须完全离线可通关；远程内容永远是可撤销的叙事增强。
4. **可迁移存档**：旧三层存档要么安全迁移到新结构，要么保留永久图鉴并开始新的五层 Run，不能静默产生非法状态。
5. **单一主角**：肉鸽队伍只有迷迭香；玩家身份只属于 Tavern 提示词上下文。
6. **资源占位**：人物、立绘、日记插图、语音、音乐只引用根目录 `assets` 注册项；缺失时显示空白占位和文本标签。
7. **可访问动效**：所有动态反馈具备文字状态、键盘路径和 `prefers-reduced-motion` 降级。

## 4. 状态架构

### 4.1 组合式领域 Slice

`gameStore.ts` 仅负责组合、持久化、迁移和跨 Slice 事务入口：

- `runSlice`：Run 生命周期、模式、层数、回合、终局和永久进度。
- `mazeSlice`：当前层拓扑、节点状态、路径锁和移动候选。
- `rosmontisSlice`：稳定性、过载状态机、AP、四柄巨剑、陪伴动作。
- `inventorySlice`：记忆碎片、模块、残响、侦测和槽位溢出。
- `diarySlice`：局外手记条目、博士批注、生成来源和同步状态。
- `llmDirectorSlice`：事件、台词、日记、楼层蓝图请求及幂等触发。

纯规则模块不导入 React、Zustand、Dexie 或浏览器 API。Store Action 负责把当前快照传入规则函数，再一次性写回结果和事件日志。

### 4.2 关键类型

```ts
export type MazeNodeType =
  | 'combat'
  | 'emergency-combat'
  | 'safehouse'
  | 'shop'
  | 'encounter'
  | 'dilemma'
  | 'unknown'
  | 'boss';

export type OverloadBand = 'normal' | 'warning' | 'berserk' | 'collapse';
export type MemoryFragmentKind = 'emotion' | 'pain' | 'skill' | 'core';
export type RunEra = 'trauma-recovery' | 'boundless-mindsea';

export interface FloorDefinition {
  floor: number;
  title: string;
  era: RunEra;
  bossKind: 'gatekeeper' | 'closed-heart' | 'mindsea-exit';
  requiredNodeTypes: MazeNodeType[];
  targetNodeRange: readonly [number, number];
}
```

旧值迁移规则：`rest → safehouse`，`wonder → encounter`，普通碎片按标签映射为三类；无法识别的旧普通碎片默认映射为 `emotion` 并保留原名称和标签。

## 5. 五层与 6+ 层模型

### 5.1 标准五层

| 层数 | 标题 | 主题 | 出口 |
| ---: | --- | --- | --- |
| 1 | 表层残响 | 识别破碎记忆与基本指挥关系 | 守门 Boss“陌生的回声” |
| 2 | 雨幕病区 | 在照护与怀疑之间建立安全感 | 守门 Boss“雨幕看护者” |
| 3 | 冰冷实验室 | 面对痛苦碎片和过载诱惑 | 守门 Boss“无温实验体” |
| 4 | 心防回廊 | 整合战术本能与被压抑情绪 | 守门 Boss“封锁指令” |
| 5 | 核心花房 | 与幼年自我和解 | 终局 Boss“封闭之心” |

每层由六个深度列构成，节点数 9—13。入口固定为安全屋，出口固定为 Boss。中间列至少包含常规作战、安全屋、商店、不期而遇、未知，并从第二层开始允许紧急作战和命运抉择。

### 5.2 拓扑不变量

- 所有边从较浅深度指向较深深度，禁止环。
- 每个非入口节点至少有一条入边。
- 每个非出口节点至少有一条可解锁的出边。
- 从入口到 Boss 至少存在两条不同的合法路线；目标节点数过小时至少保证一条。
- 锁边不能成为某节点唯一的出路，除非当前层保证玩家仍有对应破壁充能。
- 生成后必须通过 `validateMaze`；失败时用同一种子和递增修复盐重建，最多三次，再使用保守模板。
- 有意设计的高风险支路必须明确标记，不允许无提示的永久死路。

### 5.3 第六层及以后

- 只有第五层通关、模式为 `novel` 且主接口已启用时，显示“继续并肩漫行”。
- 每层仍由本地 `generateMindseaMaze` 生成合法节点与边；LLM 只能返回 `theme`、`premise`、`nodeBriefs`、`endingHook` 和白名单环境词条。
- 远程失败时使用种子、当前碎片和层数生成本地 `FallbackBlueprint`。
- 每个 6+ 层出口为 `mindsea-exit`，完成后可继续下一层或主动结束漫行并保存手记。

## 6. 节点与统一遭遇协议

### 6.1 节点职责

- `combat`：标准残响实体，基础奖励。
- `emergency-combat`：高护盾、过载加剧等词条，奖励稀有模块或强化碎片。
- `safehouse`：稳定、疏导、复盘和陪伴恢复。
- `shop`：购买模块、出售普通碎片、进行一次记忆整理。
- `encounter`：本地/LLM 情境和 D20 选项。
- `dilemma`：明确展示代价与收益的属性置换或记忆蜕变。
- `unknown`：本地预生成真实类型，侦测只揭示，不重抽。
- `boss`：按楼层 Boss 配置进入阶段状态机。

### 6.2 统一动作

```ts
export type EncounterAction =
  | { type: 'play-sword'; swordId: GreatswordId; targetId?: string }
  | { type: 'comfort'; gesture: 'touch-forehead' | 'hold-hand' }
  | { type: 'choose'; choiceId: string }
  | { type: 'buy'; offerId: string }
  | { type: 'sell-fragment'; fragmentId: string }
  | { type: 'leave' };

export interface EncounterResolution {
  accepted: boolean;
  reason?: RosmontisMessage;
  state: EncounterRuleState;
  events: RuleEvent[];
  animation?: 'breach' | 'guard' | 'scan' | 'resonate' | 'comfort';
}
```

战斗、紧急作战、未知解密和 Boss 的主要按钮都渲染为巨剑卡；纯文本选择仅保留给休息、商店、命运抉择和叙事选项。

## 7. 迷迭香与过载状态机

### 7.1 区间

- 0—69：`normal`，无额外限制。
- 70—79：`warning`，强化视觉与风险提示。
- 80—99：`berserk`，巨剑伤害乘 2，禁用认知等精细操作，每次攻击结算后扣除稳定性。
- 100：`collapse`，Run 失败。

过载判定必须由 `getOverloadBand` 统一提供，UI 不重复写阈值。

### 7.2 安抚动作

- “轻触额头”：1 AP，降低 8 点过载；适用于非暴走状态，反馈偏日常。
- “握住手”：2 AP，降低 18 点过载并解除暴走操作限制；过载低于 70 时收益降低为 10。
- Boss 第二阶段允许“握住手”额外提高 10 点共鸣度。
- 每个动作产生第一人称反馈和结构化规则事件。

### 7.3 四柄巨剑

- 破壁：破甲、粉碎、清除障碍。
- 守望：屏障、吸收伤害、保护稳定性。
- 认知：扫描未知、揭示弱点、环境解密。
- 共鸣：全域共振、净化、核心和解。

探索用途和遭遇用途共享同一柄剑的楼层充能状态，但遭遇内仍使用 AP 和冷却。UI 必须在一张卡上同时展示“本层探索充能”和“当前战术冷却”，不再形成两个互不解释的区域。

## 8. 记忆碎片与手记簿

### 8.1 三类普通碎片

- `emotion`（生活与温存）：提供稳定恢复或过载缓和；被遗忘时获得一层“悲伤阻抗”，下一次稳定性损失减半。
- `pain`（实验室与冰冷）：提高结构/共鸣伤害，但每次触发增加过载；暴走时可能产生幻觉干扰。
- `skill`（战术与本能）：修改 AP、冷却、护盾、侦测或 D20 修正。

每枚碎片由静态效果 ID 指向本地白名单规则，LLM 只能生成名称和叙事说明，不能生成可执行表达式。

### 8.2 溢出处理

普通槽满时必须选择：

1. 放弃新碎片；
2. 遗忘旧碎片并装载新碎片；
3. 抄录旧碎片至手记簿，再遗忘并装载新碎片。

“抄录”创建局外 Diary Entry，保留名称、分类、叙事、首次发现 Run 和玩家批注，不保留局内被动效果。

### 8.3 IndexedDB

新增 `diaryEntries` 表并将数据库升至 V5。条目字段包含 `id`、`runId`、`floor`、`kind`、`title`、`body`、`imageAssetKey`、`source`、`doctorNote`、`createdAt`、`updatedAt`。备份导入导出必须包含手记，但继续排除 API 密钥。

## 9. Boss 状态机

### 9.1 第 1—4 层守门 Boss

使用配置驱动的 1—2 阶段状态机，至少包含护盾和本体/稳定阶段。完成后获得一枚当前楼层主题碎片，并进入下一层。

### 9.2 第 5 层“封闭之心”

阶段一“破除心防”：允许破壁、守望和安抚；目标是把心防降到 0。

阶段二“拥抱与共鸣”：禁用所有伤害动作，只允许共鸣与安抚；目标是把共鸣度升到 100。非法卡片必须显示角色化原因，不得静默无效。

共鸣度达到 100 后完成五层通关、写入核心碎片和手记，并根据模式/API 状态显示离开或继续第六层。

## 10. 陪伴交互与文案边界

- 游戏世界内的移动阻断、碎片溢出、过载警告和非法战术使用角色第一人称文案。
- API 地址、密钥、JSON、导入和数据库错误继续使用精确技术文案，并可附加温和说明。
- 主控台常驻 `CompanionInteractionBar`，至少包含“轻触额头”和“握住手”。
- 第一人称反馈由本地状态矩阵立即生成；远程台词只异步替换表现层，不撤销已完成本地结算。
- 高过载时允许文本喘息和资源槽音频提示；音频缺失时不自动播放，不报错。

## 11. LLM 编排

### 11.1 任务类型

- `event-v2`：情境、2—3 个选项、D20 阈值、意图白名单。
- `quote-v2`：不超过 30 个中文字符的第一人称反馈。
- `diary-v1`：标题、正文、情绪标签和建议插图资产键。
- `mindsea-floor-v1`：楼层主题、前提、节点简报和结尾钩子。

### 11.2 安全边界

- 解析器先验证 JSON 形状，再验证节点 ID、节点类型、选项数量、阈值范围和白名单意图。
- 请求带超时和 AbortSignal；同一 Run/楼层/节点/任务使用稳定幂等键。
- 返回内容只写入 `llmDirectorSlice` 或 Diary 表，不直接写入规则快照。
- 失败时记录可诊断错误码并接受本地回退内容。

## 12. 视觉、图标与合规

- 安装 `lucide-react`，逐模块替换 Phosphor；最终从依赖中移除 Phosphor。
- 全局扫描禁止 Emoji 字符出现在可见界面文案。
- 过载 80+ 在应用壳设置 `data-overload-band="berserk"`，激活边缘青蓝呼吸、局部 CRT 抖动和轻微色散。
- `prefers-reduced-motion: reduce` 或“减少动效”设置下停用位移、抖动和持续呼吸，只保留静态边框警示。
- 战术卡 Hover 倾斜不超过 2 度，不改变布局；键盘 Focus 提供等价高亮。
- 应用全局壳可见区域和系统设置显示：

  “本项目为基于《明日方舟》世界观的非营利性同人衍生作品，角色及设定版权归上海鹰角网络科技有限公司所有。”

## 13. 迁移策略

肉鸽存档版本从 5 升至 6：

- 已结束 Run：保留进度、Run 历史、永久图鉴和设置，创建新的五层待机 Run。
- 进行中的三层 Run：保留永久进度、图鉴、档案和 UI 偏好；将当前 Run 归档为 `legacy-migrated` 后创建相同种子的五层 Run，显示一次迁移说明。
- 旧节点和碎片值按第 4.2 节映射。
- Tavern 数据库从 V4 升至 V5，新增手记表；现有表原样保留。

## 14. 验收证据

- 单元测试证明五层拓扑不变量、八类节点、过载区间、暴走倍率、反噬、安抚、三类碎片和 Boss 阶段。
- Store 测试证明旧存档迁移、跨 Slice 原子结算、图鉴/手记持久化和 LLM 回退不改规则。
- 组件测试证明巨剑卡直接驱动遭遇、禁用原因可见、手记可批注、所有新核心控件 ID 唯一。
- Playwright 离线通关第 1—5 层；远程模拟进入第 6 层；畸形 JSON 回退后 Run 可继续。
- 构建、类型检查、完整 Vitest、Playwright、唯一 ID、Emoji、占位资源和控制台告警审查全部通过。

## 15. 分阶段交付

1. 领域契约、五层拓扑、存档 V6。
2. 统一遭遇协议、八类节点、四柄巨剑与过载状态机。
3. 三类碎片、手记 IndexedDB 和陪伴栏。
4. 五层 Boss 闭环和离线端到端通关。
5. LLM 分层 Prompt、第 6+ 层与回退。
6. Lucide、视觉动效、免责声明和最终验收。

每一阶段必须先新增失败测试，再实现、运行相关测试与完整类型检查，随后提交并推送当前分支。
