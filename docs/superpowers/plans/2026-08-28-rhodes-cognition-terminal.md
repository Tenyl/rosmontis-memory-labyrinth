# 罗德岛意识战术终端实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一套可本地运行、纯前端、全中文、高保真且具备完整交互演示闭环的 LLM 战术跑团终端。

**Architecture:** 使用 React Router 管理六个懒加载页面，Zustand 分片状态统一维护剧情、记忆节点、干员、档案与界面状态，本地 `NarrativeEngine` 以可暂停的分段输出模拟 LLM。共享终端框架、弹层、通知和设计令牌提供一致视觉与无障碍行为；所有数据均来自浏览器端演示数据和 `localStorage`。

**Tech Stack:** React 19.2.8、TypeScript 7.0.2、Vite 8.2.2、React Router DOM 7.18.2、Zustand 5.0.15、Phosphor Icons React 2.1.10、Vitest 4.1.11、Testing Library React 16.3.3、Playwright 1.62.1、原生 CSS。

**Spec:** `docs/superpowers/specs/2026-08-28-rhodes-cognition-terminal-design.md`

## Global Constraints

- 只实现浏览器端界面、模拟数据、交互状态与本地持久化；不得添加 API、数据库、鉴权、服务器、真实 LLM 请求或密钥配置。
- 主界面文案使用简体中文；原创品牌标记、坐标、编号和装饰性系统代码可使用英文或拉丁字符。
- 不使用 Emoji 作为结构图标；图标统一从 `@phosphor-icons/react` 按需导入。
- 不调用浏览器 `alert`、`confirm` 或系统通知；使用应用内弹层与通知。
- 所有交互元素必须具有唯一、描述性 ID，命名采用 `区域-对象-动作`。
- 正常正文对比度至少 4.5:1；功能状态不得只依赖颜色。
- 支持键盘导航、模态焦点管理、列表等价视图和 `prefers-reduced-motion`。
- 关键布局必须在 375、768、1024、1440 像素宽度下可用且无页面级水平滚动。
- 生产代码严格遵循测试先行：先写失败测试并确认失败原因，再写最小实现。
- 每个任务完成后运行本任务测试和完整测试集，并提交独立 Git commit。

---

## 文件职责图

```text
src/
├── app/
│   ├── App.tsx                 # RouterProvider 与全局错误边界
│   ├── AppShell.tsx            # 导航、顶部状态栏、主内容与弹层挂载点
│   └── router.tsx              # 六个懒加载路由
├── components/
│   ├── Dialog.tsx              # 焦点锁定、Escape、焦点恢复
│   ├── NotificationCenter.tsx  # 应用内通知与撤销动作
│   ├── SegmentedControl.tsx    # 标签式视图切换
│   ├── StatusBadge.tsx         # 图标、文字、形状并用的状态标记
│   ├── Meter.tsx               # 带文本替代的进度/风险仪表
│   └── PageHeader.tsx          # 页面标题、编号和主操作
├── data/
│   └── demoData.ts             # 完整中文演示数据
├── features/
│   ├── operation/              # 剧情流、指令控制台、NarrativeEngine
│   ├── memory/                 # 节点图、层级列表、拓建和检查器
│   ├── operators/              # 迷迭香与随行小队
│   ├── archive/                # 档案、关系图、推理台
│   ├── log/                    # 行动时间线与剧情回溯
│   └── settings/               # 密度、字体、动效、重置
├── store/
│   ├── gameStore.ts            # Zustand 状态、动作与持久化边界
│   └── selectors.ts            # 各页面稳定选择器
├── styles/
│   ├── tokens.css              # 色彩、排版、空间、层级、动效令牌
│   ├── global.css              # Reset、语义元素、焦点与背景纹理
│   └── responsive.css          # 375/768/1024/1440 布局规则
├── test/
│   ├── setup.ts                # jest-dom、浏览器 API 测试替身
│   └── renderApp.tsx           # 带路由和状态重置的测试渲染器
├── types/
│   └── game.ts                 # 所有领域模型与 NarrativeEngine 接口
└── main.tsx                    # 浏览器入口
e2e/
├── core-flow.spec.ts           # 完整演示闭环
├── navigation-modals.spec.ts   # 路由、弹层、唯一 ID 与键盘
└── responsive.spec.ts          # 四个断点与减少动态效果
```

---

### Task 1: 工程基线、测试运行器与设计令牌

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.gitignore`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/test/setup.ts`
- Create: `src/app/App.test.tsx`

**Interfaces:**
- Produces: `App(): JSX.Element`；CSS 语义令牌；`pnpm dev`、`pnpm build`、`pnpm test`、`pnpm test:e2e` 脚本。
- Consumes: 无。

- [ ] **Step 1: 创建依赖与工具配置**

`package.json` 固定以下依赖边界，并使用 ESM：

```json
{
  "name": "rhodes-cognition-terminal",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "typecheck": "tsc -b",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "preview": "vite preview --host 127.0.0.1"
  },
  "dependencies": {
    "@phosphor-icons/react": "2.1.10",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "react-router-dom": "7.18.2",
    "zustand": "5.0.15"
  },
  "devDependencies": {
    "@playwright/test": "1.62.1",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.3",
    "@testing-library/user-event": "14.6.6",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.5",
    "@vitejs/plugin-react": "6.1.1",
    "jsdom": "30.0.1",
    "typescript": "7.0.2",
    "vite": "8.2.2",
    "vitest": "4.1.11"
  }
}
```

Run: `pnpm install`

Expected: lockfile created and install exits 0.

- [ ] **Step 2: 写应用壳层失败测试**

```tsx
import { render, screen } from '@testing-library/react';
import { App } from './App';

test('renders the original terminal brand and skip link', () => {
  render(<App />);
  expect(screen.getByRole('link', { name: '跳至主内容' })).toHaveAttribute('href', '#main-content');
  expect(screen.getByText('罗德岛意识战术终端')).toBeVisible();
});
```

- [ ] **Step 3: 运行测试确认正确失败**

Run: `pnpm test src/app/App.test.tsx`

Expected: FAIL because `App` and its rendered semantics do not exist.

- [ ] **Step 4: 实现最小应用壳与视觉令牌**

`App` 先提供跳转链接、原创品牌和 `main#main-content`。`tokens.css` 定义规格中的 11 个颜色令牌、字体栈、4/8px 空间尺度、三档层级、三档阴影和 120/240/380ms 动效令牌。`global.css` 实现深色背景、静态网格、16px 正文、可见焦点环、按钮按压反馈和减少动态效果规则。

```tsx
export function App() {
  return (
    <div className="app-root">
      <a className="skip-link" href="#main-content">跳至主内容</a>
      <header><strong>罗德岛意识战术终端</strong></header>
      <main id="main-content" tabIndex={-1}>终端正在建立本地演示会话</main>
    </div>
  );
}
```

- [ ] **Step 5: 验证测试与构建**

Run: `pnpm test src/app/App.test.tsx`

Run: `pnpm typecheck`

Run: `pnpm build`

Expected: test PASS; build exits 0 without TypeScript errors.

- [ ] **Step 6: 提交**

```bash
git add package.json pnpm-lock.yaml tsconfig.json tsconfig.app.json vite.config.ts index.html .gitignore src
git commit -m "chore: bootstrap terminal frontend"
```

---

### Task 2: 领域类型、演示数据与持久化状态

**Files:**
- Create: `src/types/game.ts`
- Create: `src/data/demoData.ts`
- Create: `src/store/gameStore.ts`
- Create: `src/store/selectors.ts`
- Create: `src/store/gameStore.test.ts`
- Create: `src/test/renderApp.tsx`

**Interfaces:**
- Produces: `GameState`、`NarrativeEntry`、`MemoryNode`、`Operator`、`ArchiveRecord`、`NotificationItem`、`NarrativeEngine`、`NarrativeOutcome`；`useGameStore`；`resetDemoState()`；`buildDemoState()`；`deepMemoryClue`。
- Consumes: Zustand `create`、`persist`、`createJSONStorage`。

- [ ] **Step 1: 写状态失败测试**

```ts
test('starts with three specified surface-memory nodes', () => {
  const state = buildDemoState();
  expect(state.memoryMap.nodes.map((node) => node.title)).toEqual([
    '雨幕中的疗养院',
    '无声候车厅',
    '编号 R-09 隔离室',
  ]);
});

test('resets mutated stress and archive state', () => {
  useGameStore.getState().setOperatorStress('rosmontis', 57);
  useGameStore.getState().addArchiveRecord(deepMemoryClue);
  useGameStore.getState().resetDemoState();
  expect(useGameStore.getState().operators.byId.rosmontis.stress).toBe(41);
  expect(useGameStore.getState().archive.records).toHaveLength(4);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/store/gameStore.test.ts`

Expected: FAIL because types, demo factory and store actions are missing.

- [ ] **Step 3: 定义精确领域模型**

```ts
export type RiskLevel = 'C' | 'B' | 'A' | 'S';
export type GenerationStatus = 'idle' | 'parsing' | 'streaming' | 'paused' | 'interrupted' | 'complete';
export type MemoryDirection = 'left' | 'right' | 'down';
export type ArchiveKind = '线索' | '人物' | '地点' | '事件' | '证物';

export interface MemoryNode {
  id: string;
  title: string;
  layer: '表层记忆' | '深层潜意识' | '未知战局';
  risk: RiskLevel;
  hostileCount: number | null;
  alliedCount: number;
  exploration: number;
  anchored: boolean;
  x: number;
  y: number;
  summary: string;
}

export interface NarrativeEngine {
  run(command: string, onChunk: (chunk: string) => void): Promise<NarrativeOutcome>;
  pause(): void;
  resume(): void;
  cancel(): void;
}

export interface NarrativeOutcome {
  entryId: string;
  checkTotal: number;
  operatorStress: number;
  unlockedNodeId: string;
  archiveRecordId: string;
}
```

- [ ] **Step 4: 实现完整演示数据与动作**

`demoData.ts` 写入规格中的剧情、三个节点、迷迭香属性、阿米娅/末药/蛇屠箱、四份初始档案、五类行动记录和建议指令。`gameStore.ts` 实现命令草稿、生成状态、节点拓建、压力更新、档案新增、通知、偏好和重置动作；持久化只保存 `session`、`memoryMap`、`operators`、`archive` 与 `ui.preferences`。

- [ ] **Step 5: 验证状态测试**

Run: `pnpm test src/store/gameStore.test.ts`

Expected: both tests PASS; `localStorage` serialization contains no functions.

- [ ] **Step 6: 提交**

```bash
git add src/types src/data src/store src/test/renderApp.tsx
git commit -m "feat: add tactical demo state"
```

---

### Task 3: 路由终端框架与响应式导航

**Files:**
- Create: `src/app/router.tsx`
- Create: `src/app/AppShell.tsx`
- Create: `src/app/AppShell.test.tsx`
- Create: `src/components/PageHeader.tsx`
- Create: `src/features/operation/OperationPage.tsx`
- Create: `src/features/memory/MemoryPage.tsx`
- Create: `src/features/operators/OperatorsPage.tsx`
- Create: `src/features/archive/ArchivePage.tsx`
- Create: `src/features/log/LogPage.tsx`
- Create: `src/features/settings/SettingsPage.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles/global.css`
- Create: `src/styles/responsive.css`

**Interfaces:**
- Produces: `router`；`AppShell`；六个具备完成态标题和导览说明的路由页面。
- Consumes: `useGameStore` 的会话、风险、未读档案和导航状态。

- [ ] **Step 1: 写路由与导航失败测试**

```tsx
test.each([
  ['/operation', '作战主控台'],
  ['/memory', '意识战场'],
  ['/operators', '干员与小队'],
  ['/archive', '情报档案库'],
  ['/log', '行动记录'],
  ['/settings', '系统设置'],
])('renders %s with active navigation', async (path, heading) => {
  renderApp(path);
  expect(await screen.findByRole('heading', { name: heading })).toBeVisible();
  expect(screen.getByRole('link', { name: heading })).toHaveAttribute('aria-current', 'page');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/app/AppShell.test.tsx`

Expected: FAIL because the router and navigation do not exist.

- [ ] **Step 3: 实现懒加载路由和终端框架**

`router.tsx` 使用 `lazy()` 加载六个页面，根路径重定向 `/operation`。`AppShell` 使用语义化 `header/nav/main`，包含品牌、带图标和文字的主导航、顶部行动状态、快捷键按钮与通知挂载点。每个链接使用 `nav-<route>-open` ID。

```tsx
const OperationPage = lazy(() => import('../features/operation/OperationPage'));

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/operation" replace /> },
      { path: 'operation', element: <OperationPage /> },
    ],
  },
]);
```

- [ ] **Step 4: 实现四档导航布局**

`responsive.css` 在 1440px 展开侧栏，1024px 压缩宽度，768px 改为顶部紧凑栏，375px 使用可横向换行但不产生页面级横向滚动的导航。固定区域为主内容设置相应 `scroll-padding` 与内边距。

- [ ] **Step 5: 验证路由测试与分包**

Run: `pnpm test src/app/AppShell.test.tsx`

Run: `pnpm build`

Expected: six cases PASS; Vite output contains separate lazy route chunks.

- [ ] **Step 6: 提交**

```bash
git add src/app src/features src/components/PageHeader.tsx src/styles
git commit -m "feat: add terminal routing shell"
```

---

### Task 4: 弹层、通知、状态标记与仪表组件

**Files:**
- Create: `src/components/Dialog.tsx`
- Create: `src/components/Dialog.test.tsx`
- Create: `src/components/NotificationCenter.tsx`
- Create: `src/components/NotificationCenter.test.tsx`
- Create: `src/components/SegmentedControl.tsx`
- Create: `src/components/StatusBadge.tsx`
- Create: `src/components/Meter.tsx`
- Create: `src/components/components.css`
- Modify: `src/app/AppShell.tsx`

**Interfaces:**
- Produces: `Dialog({ id, title, open, onClose, children, footer })`；`NotificationCenter`；`StatusBadge`；`Meter`；`SegmentedControl`。
- Consumes: `ui.notifications`、`ui.activeDialog` 及对应 store actions。

- [ ] **Step 1: 写焦点与通知失败测试**

```tsx
function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button id="test-dossier-open" onClick={() => setOpen(true)}>打开档案</button>
      <Dialog id="test-dossier-dialog" title="档案详情" open={open} onClose={() => setOpen(false)}>
        <button id="test-dossier-primary">确认</button>
      </Dialog>
    </>
  );
}

test('traps focus, closes with Escape, and restores trigger focus', async () => {
  const user = userEvent.setup();
  render(<DialogHarness />);
  const trigger = screen.getByRole('button', { name: '打开档案' });
  await user.click(trigger);
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

test('announces a contextual notification without moving focus', () => {
  const stressWarning: NotificationItem = {
    id: 'notification-stress-57',
    kind: 'warning',
    title: '精神负荷警告',
    message: '迷迭香精神负荷已升至 57',
  };
  render(<NotificationCenter items={[stressWarning]} />);
  expect(screen.getByRole('status')).toHaveTextContent('迷迭香精神负荷已升至 57');
  expect(document.activeElement).toBe(document.body);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/components/Dialog.test.tsx src/components/NotificationCenter.test.tsx`

Expected: FAIL because shared components are absent.

- [ ] **Step 3: 实现无障碍弹层与通知**

`Dialog` 保存触发元素、在打开时聚焦标题、Tab 循环于弹层内、Escape 调用 `onClose`、关闭后恢复焦点。`NotificationCenter` 使用单一 `role="status" aria-live="polite" aria-atomic="true"` 容器，成功、警告、危险、处理中均显示图标、标题、说明和可选动作。

- [ ] **Step 4: 实现视觉组件**

`StatusBadge` 同时显示图标、可见文字和不同边框形态；`Meter` 输出数值、单位与状态文字并使用原生 `meter` 或带准确 ARIA 值的结构；`SegmentedControl` 使用按钮组与 `aria-pressed`。

- [ ] **Step 5: 验证共享组件**

Run: `pnpm test src/components`

Run: `pnpm test`

Expected: component tests and full suite PASS without accessibility console warnings.

- [ ] **Step 6: 提交**

```bash
git add src/components src/app/AppShell.tsx
git commit -m "feat: add accessible terminal overlays"
```

---

### Task 5: 作战主控台与本地叙事引擎

**Files:**
- Create: `src/features/operation/narrativeEngine.ts`
- Create: `src/features/operation/narrativeEngine.test.ts`
- Create: `src/features/operation/CommandConsole.tsx`
- Create: `src/features/operation/NarrativeStream.tsx`
- Create: `src/features/operation/TacticalOverview.tsx`
- Create: `src/features/operation/OperationDialogs.tsx`
- Create: `src/features/operation/OperationPage.test.tsx`
- Create: `src/features/operation/operation.css`
- Modify: `src/features/operation/OperationPage.tsx`
- Modify: `src/store/gameStore.ts`

**Interfaces:**
- Produces: `NarrativeScheduler`；`createLocalNarrativeEngine(scheduler?)`；`submitCommand()`、`pauseGeneration()`、`resumeGeneration()`、`retryGeneration()`；完整主控台。
- Consumes: `NarrativeEngine`、剧情和战术状态、共享 `Dialog/Meter/StatusBadge`。

- [ ] **Step 1: 写引擎失败测试**

```ts
test('streams the residual-memory scenario and applies the outcome', async () => {
  vi.useFakeTimers();
  const chunks: string[] = [];
  const engine = createLocalNarrativeEngine();
  const outcomePromise = engine.run('让迷迭香读取残留意识', (chunk) => chunks.push(chunk));
  await vi.runAllTimersAsync();
  const outcome = await outcomePromise;
  expect(chunks.join('')).toContain('墙体后的儿童合唱');
  expect(outcome.operatorStress).toBe(57);
  expect(outcome.unlockedNodeId).toBe('memory-deep-chorus');
});
```

- [ ] **Step 2: 运行引擎测试确认失败**

Run: `pnpm test src/features/operation/narrativeEngine.test.ts`

Expected: FAIL because engine factory is missing.

- [ ] **Step 3: 实现可暂停本地叙事引擎**

使用可注入的 `NarrativeScheduler` 依次发送 5 段中文剧情；该接口只暴露 `schedule(callback, delayMs)` 与 `cancel(handle)`。`pause` 阻止下一段调度，`resume` 恢复，`cancel` 清理计时器，第二次 `run` 先取消旧任务。完成结果包含检定、线索、节点和压力更新，不进行网络请求。

- [ ] **Step 4: 写主控台失败测试**

```tsx
test('validates empty command inline and completes the demo loop', async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  renderApp('/operation');
  await user.click(screen.getByRole('button', { name: '发送指令' }));
  expect(screen.getByText('请输入行动描述，或从上方选择一项建议')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '让迷迭香读取残留意识' }));
  await user.click(screen.getByRole('button', { name: '发送指令' }));
  await vi.runAllTimersAsync();
  expect(screen.getByText(/感知检定成功/)).toBeVisible();
  expect(useGameStore.getState().operators.byId.rosmontis.stress).toBe(57);
});
```

- [ ] **Step 5: 运行页面测试确认失败**

Run: `pnpm test src/features/operation/OperationPage.test.tsx`

Expected: FAIL because command, stream and overview components are absent.

- [ ] **Step 6: 实现完整主控台**

实现五类带编号记录、三种输入模式、三条建议、流式状态、暂停/继续/重试、检定详情弹层，以及规格中的目标、风险、回合顺序、小队摘要、待处理情报和精神仪表。所有动作使用 `operation-*` 唯一 ID。

- [ ] **Step 7: 验证主控台与完整状态闭环**

Run: `pnpm test src/features/operation`

Expected: engine and page tests PASS; no global browser dialog APIs are called.

- [ ] **Step 8: 提交**

```bash
git add src/features/operation src/store/gameStore.ts
git commit -m "feat: build narrative operation console"
```

---

### Task 6: 意识战场节点图、列表与三向拓建

**Files:**
- Create: `src/features/memory/MemoryGraph.tsx`
- Create: `src/features/memory/MemoryList.tsx`
- Create: `src/features/memory/MemoryInspector.tsx`
- Create: `src/features/memory/ExpansionDialog.tsx`
- Create: `src/features/memory/MemoryPage.test.tsx`
- Create: `src/features/memory/memory.css`
- Modify: `src/features/memory/MemoryPage.tsx`
- Modify: `src/store/gameStore.ts`

**Interfaces:**
- Produces: `expandMemoryNode(sourceId, direction)`；图形/列表等价视图；节点详情、高危确认和拓建确认。
- Consumes: `MemoryNode`、`MemoryDirection`、共享弹层和状态组件。

- [ ] **Step 1: 写初始节点与拓建失败测试**

```tsx
test('shows the three surface nodes with tactical metadata', () => {
  renderApp('/memory');
  expect(screen.getByRole('button', { name: /雨幕中的疗养院.*危险 B.*敌对 3/ })).toBeVisible();
  expect(screen.getByRole('button', { name: /无声候车厅.*危险 C.*敌情未知/ })).toBeVisible();
  expect(screen.getByRole('button', { name: /编号 R-09 隔离室.*危险 A/ })).toBeVisible();
});

test.each(['向下拓建', '向左拓建', '向右拓建'])('expands with %s after confirmation', async (label) => {
  const user = userEvent.setup();
  renderApp('/memory');
  await user.click(screen.getByRole('button', { name: /编号 R-09 隔离室/ }));
  await user.click(screen.getByRole('button', { name: label }));
  await user.click(screen.getByRole('button', { name: '确认拓建' }));
  expect(screen.getByText(/路径已建立/)).toBeVisible();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/features/memory/MemoryPage.test.tsx`

Expected: FAIL because memory controls are absent.

- [ ] **Step 3: 实现 SVG 节点图与检查器**

使用数据坐标绘制节点和连线；每个节点是实际 `button` 或外覆可操作按钮，不把 SVG 图形当作唯一操作入口。选中节点打开含概况、驻守单位、环境效果、情报、历史和四个行动的检查器。危险 A 的“进入”动作打开高危确认。

- [ ] **Step 4: 实现列表等价视图与三向拓建**

列表按“表层记忆、深层潜意识、未知战局”分组。拓建根据方向生成确定的演示节点标题、风险、敌我信息和坐标；按钮 ID 分别为 `memory-expand-down`、`memory-expand-left`、`memory-expand-right`。移动端默认列表，桌面保留用户上次选择。

- [ ] **Step 5: 验证节点交互**

Run: `pnpm test src/features/memory/MemoryPage.test.tsx`

Run: `pnpm test`

Expected: initial-node and three direction cases PASS; full suite remains green.

- [ ] **Step 6: 提交**

```bash
git add src/features/memory src/store/gameStore.ts
git commit -m "feat: build expandable memory battlefield"
```

---

### Task 7: 迷迭香档案与随行小队

**Files:**
- Create: `src/features/operators/RosmontisProfile.tsx`
- Create: `src/features/operators/SquadRoster.tsx`
- Create: `src/features/operators/OperatorDialog.tsx`
- Create: `src/features/operators/OperatorsPage.test.tsx`
- Create: `src/features/operators/operators.css`
- Modify: `src/features/operators/OperatorsPage.tsx`

**Interfaces:**
- Produces: 完整迷迭香属性视图、趋势文本、状态效果和三名队员档案弹层。
- Consumes: `operators.byId`、共享 `Dialog/Meter/StatusBadge`。

- [ ] **Step 1: 写属性与档案失败测试**

```tsx
test('renders Rosmontis RPG statistics and current condition', () => {
  renderApp('/operators');
  expect(screen.getByText('理智稳定度')).toBeVisible();
  expect(screen.getByText('72%')).toBeVisible();
  expect(screen.getByText('精神负荷')).toBeVisible();
  expect(screen.getByText('41 / 100')).toBeVisible();
  expect(screen.getByText('轻度意识重叠')).toBeVisible();
});

test('opens a completed squad dossier', async () => {
  const user = userEvent.setup();
  renderApp('/operators');
  await user.click(screen.getByRole('button', { name: '查看阿米娅完整档案' }));
  expect(screen.getByRole('dialog', { name: '阿米娅战术档案' })).toBeVisible();
  expect(screen.getByText('下一行动')).toBeVisible();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/features/operators/OperatorsPage.test.tsx`

Expected: FAIL because operator components are absent.

- [ ] **Step 3: 实现主档案与队伍卡**

迷迭香页显示规格中的六项属性、三项特性、精神趋势、医疗备注、装备和能力；图形摘要附完整文本说明。阿米娅、末药、蛇屠箱卡显示生命、压力、行动点、位置、状态和下一行动，并使用原创几何身份标记代替角色立绘。

- [ ] **Step 4: 实现干员完整档案弹层**

弹层包含能力、装备、关系倾向、本局临时特征和状态来源；每名干员的数据均完整可见，不显示空区域。

- [ ] **Step 5: 验证并提交**

Run: `pnpm test src/features/operators/OperatorsPage.test.tsx`

Run: `pnpm build`

Expected: tests PASS and page compiles without image assets.

```bash
git add src/features/operators
git commit -m "feat: add operator and squad dossiers"
```

---

### Task 8: 情报档案库、关系视图与推理台

**Files:**
- Create: `src/features/archive/ArchiveGrid.tsx`
- Create: `src/features/archive/ArchiveFilters.tsx`
- Create: `src/features/archive/ArchiveRelationGraph.tsx`
- Create: `src/features/archive/ReasoningBoard.tsx`
- Create: `src/features/archive/ArchiveDialog.tsx`
- Create: `src/features/archive/ArchivePage.test.tsx`
- Create: `src/features/archive/archive.css`
- Modify: `src/features/archive/ArchivePage.tsx`
- Modify: `src/store/gameStore.ts`

**Interfaces:**
- Produces: 三种档案视图；`setArchiveFilter`、`pinArchiveRecord`、`linkArchiveRecords`、`saveArchiveNote`。
- Consumes: 四份初始档案、关系、筛选、钉选和批注草稿。

- [ ] **Step 1: 写档案内容与视图失败测试**

```tsx
test('filters completed archive records by kind', async () => {
  const user = userEvent.setup();
  renderApp('/archive');
  expect(screen.getByText('潮湿的儿童病历')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '人物' }));
  expect(screen.getByText('没有倒影的护理员伊莲')).toBeVisible();
  expect(screen.queryByText('潮湿的儿童病历')).not.toBeInTheDocument();
});

test('builds a hypothesis from pinned evidence and exposes conflicts', async () => {
  const user = userEvent.setup();
  renderApp('/archive');
  await user.click(screen.getByRole('button', { name: /钉选潮湿的儿童病历/ }));
  await user.click(screen.getByRole('tab', { name: '推理台' }));
  expect(screen.getByText('支持证据')).toBeVisible();
  expect(screen.getByText('冲突证据')).toBeVisible();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/features/archive/ArchivePage.test.tsx`

Expected: FAIL because archive views are absent.

- [ ] **Step 3: 实现档案视图与详情**

实现搜索、类型筛选、可信度排序、未读状态、钉选和四份完整档案。详情弹层显示编号、摘要、原始来源、首次发现、可信度、污染风险、验证状态、关联和玩家批注；关闭有未保存批注时显示三选项确认框。

- [ ] **Step 4: 实现关系视图与列表替代**

SVG 关系图显示四份档案及其“支持、冲突、出现于、指向”关系；节点可通过按钮、Tab 和列表操作。用户选择两个档案后可建立关联，并收到可撤销通知。

- [ ] **Step 5: 实现推理台**

已钉选档案进入支持或冲突区域，综合可信度按可解释加权规则显示，同时明确“系统只标记矛盾，不给出最终结论”。

- [ ] **Step 6: 验证并提交**

Run: `pnpm test src/features/archive/ArchivePage.test.tsx`

Run: `pnpm test`

Expected: filter, hypothesis, dialog and relation operations PASS.

```bash
git add src/features/archive src/store/gameStore.ts
git commit -m "feat: build intelligence archive workspace"
```

---

### Task 9: 行动记录、设置、快捷键与重置流程

**Files:**
- Create: `src/features/log/ActionTimeline.tsx`
- Create: `src/features/log/ReplayDialog.tsx`
- Create: `src/features/log/LogPage.test.tsx`
- Create: `src/features/log/log.css`
- Create: `src/features/settings/PreferenceControls.tsx`
- Create: `src/features/settings/ResetDemoDialog.tsx`
- Create: `src/features/settings/SettingsPage.test.tsx`
- Create: `src/features/settings/settings.css`
- Create: `src/components/ShortcutDialog.tsx`
- Create: `src/components/ShortcutDialog.test.tsx`
- Modify: `src/features/log/LogPage.tsx`
- Modify: `src/features/settings/SettingsPage.tsx`
- Modify: `src/app/AppShell.tsx`

**Interfaces:**
- Produces: 行动时间线筛选、回溯弹层、六项界面偏好、快捷键弹层和重置演示确认。
- Consumes: `session`、`narrative.entries`、`ui.preferences`、`resetDemoState`。

- [ ] **Step 1: 写时间线与设置失败测试**

```tsx
test('filters the action timeline and opens source replay', async () => {
  const user = userEvent.setup();
  renderApp('/log');
  await user.click(screen.getByRole('button', { name: '仅显示检定' }));
  await user.click(screen.getByRole('button', { name: /打开感知检定详情/ }));
  expect(screen.getByRole('dialog', { name: '剧情回溯' })).toBeVisible();
});

test('changes reduced motion preference and resets the demo after confirmation', async () => {
  const user = userEvent.setup();
  renderApp('/settings');
  await user.click(screen.getByRole('radio', { name: '减少动效' }));
  expect(document.documentElement).toHaveAttribute('data-motion', 'reduced');
  await user.click(screen.getByRole('button', { name: '恢复演示初始状态' }));
  expect(screen.getByRole('dialog', { name: '确认恢复演示' })).toBeVisible();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/features/log src/features/settings`

Expected: FAIL because timeline and preferences are absent.

- [ ] **Step 3: 实现行动记录**

时间线显示章节、玩家指令、检定、状态变化、节点解锁和情报入库，支持记录类型、角色和章节筛选。回溯弹层显示原始剧情、关联对象和“前往相关页面”链接。

- [ ] **Step 4: 实现设置与快捷键**

设置页实现密度、文本速度、动效、字体大小、高对比和自动保存。`AppShell` 的快捷键按钮打开完整说明；`?` 打开说明，`/` 聚焦作战台指令输入，Escape 遵循弹层规则。

- [ ] **Step 5: 实现重置确认**

危险确认列出将恢复的剧情、节点、压力、档案和偏好范围；确认后调用 `resetDemoState` 并显示“演示状态已恢复”成功通知。

- [ ] **Step 6: 验证并提交**

Run: `pnpm test src/features/log src/features/settings src/components/ShortcutDialog.test.tsx`

Run: `pnpm test`

Expected: timeline, preferences, shortcut and reset tests PASS.

```bash
git add src/features/log src/features/settings src/components/ShortcutDialog.tsx src/app/AppShell.tsx
git commit -m "feat: add action log and terminal settings"
```

---

### Task 10: 响应式、无障碍、性能与唯一 ID 审计

**Files:**
- Create: `src/test/accessibility.test.tsx`
- Create: `src/test/uniqueIds.test.tsx`
- Create: `src/test/responsive-contract.test.ts`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/global.css`
- Modify: `src/styles/responsive.css`
- Modify: feature CSS files as failures identify

**Interfaces:**
- Produces: 全应用键盘与动效契约；四档响应式 CSS；自动唯一 ID 审计。
- Consumes: 六个完成态路由和全部共享交互组件。

- [ ] **Step 1: 写唯一 ID 与语义失败测试**

```tsx
test.each(['/operation', '/memory', '/operators', '/archive', '/log', '/settings'])(
  '%s has unique ids for every interactive element',
  async (path) => {
    const { container } = renderApp(path);
    const controls = [...container.querySelectorAll('button, a, input, textarea, select, [role="tab"]')];
    const ids = controls.map((element) => element.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  },
);
```

- [ ] **Step 2: 写减少动态效果与移动视图失败测试**

```ts
test('responsive stylesheet defines all required breakpoints and reduced motion', () => {
  const css = readFileSync('src/styles/responsive.css', 'utf8') + readFileSync('src/styles/global.css', 'utf8');
  expect(css).toContain('@media (max-width: 1439px)');
  expect(css).toContain('@media (max-width: 1023px)');
  expect(css).toContain('@media (max-width: 767px)');
  expect(css).toContain('@media (prefers-reduced-motion: reduce)');
});
```

- [ ] **Step 3: 运行审计测试确认失败**

Run: `pnpm test src/test/uniqueIds.test.tsx src/test/accessibility.test.tsx src/test/responsive-contract.test.ts`

Expected: FAIL with exact controls or CSS contracts not yet compliant.

- [ ] **Step 4: 修正全部审计问题**

为缺失控件补充唯一 ID；校正标题顺序、可见标签、ARIA 状态、焦点环、固定元素偏移、触摸目标和替代视图。使用 CSS 令牌替换功能组件中的临时颜色、阴影、间距和持续时间。保证 375px 无页面级水平滚动，长中文和系统编号使用安全换行。

- [ ] **Step 5: 检查包体与控制台**

Run: `pnpm build`

Expected: build exits 0; each route remains a separate chunk; no unexpected image/font asset; initial JS excludes lazy page bodies.

- [ ] **Step 6: 验证完整单元测试**

Run: `pnpm test`

Expected: all tests PASS with clean output and no React act warnings.

- [ ] **Step 7: 提交**

```bash
git add src
git commit -m "fix: harden responsive and accessible interactions"
```

---

### Task 11: 浏览器端到端验证与视觉质量闭环

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/core-flow.spec.ts`
- Create: `e2e/navigation-modals.spec.ts`
- Create: `e2e/responsive.spec.ts`
- Create: `docs/verification/2026-08-28-frontend-audit.md`
- Modify: implementation files only when a failing E2E test reproduces a defect

**Interfaces:**
- Produces: 可重复的 Chromium 端到端证据；最终验收记录。
- Consumes: `pnpm dev` 启动的本地应用。

- [ ] **Step 1: 写完整演示闭环 E2E 测试**

```ts
test('command unlocks clue, node and stress warning', async ({ page }) => {
  await page.goto('/operation');
  await page.getByRole('button', { name: '让迷迭香读取残留意识' }).click();
  await page.getByRole('button', { name: '发送指令' }).click();
  await expect(page.getByText('墙体后的儿童合唱')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('精神负荷已升至 57');
  await page.getByRole('link', { name: '意识战场' }).click();
  await expect(page.getByText('墙体后的合唱室')).toBeVisible();
  await page.getByRole('link', { name: '情报档案库' }).click();
  await expect(page.getByText('墙体后的儿童合唱')).toBeVisible();
});
```

- [ ] **Step 2: 写导航、弹层和响应式 E2E 测试**

`navigation-modals.spec.ts` 遍历六个路由，打开节点、干员、档案、回溯、快捷键和重置弹层，验证 Escape 与焦点恢复。`responsive.spec.ts` 使用 375×812、768×1024、1024×768、1440×1000 四个视口，断言 `document.documentElement.scrollWidth <= clientWidth`，并验证移动端意识战场默认列表视图。

- [ ] **Step 3: 运行 E2E 确认任何缺陷均可复现**

Run: `pnpm test:e2e`

Expected: initial failures point to real integration or layout defects; if all pass, proceed to manual visual inspection.

- [ ] **Step 4: 仅针对复现缺陷写更窄测试并修复**

每个发现的问题先补一个最小 Vitest 或 Playwright 失败用例，再修改对应组件或 CSS；重新运行该用例直至通过。

- [ ] **Step 5: 进行真实浏览器视觉检查**

依次检查主作战台、意识战场、干员页、档案三视图、行动记录、设置及关键弹层。重点观察中文排版、层级、毛玻璃边界、节点连线、悬停/按压状态、流式动画、减少动态效果、375px 可用性和控制台输出。

- [ ] **Step 6: 写最终验收记录**

`docs/verification/2026-08-28-frontend-audit.md` 逐项记录：测试命令与退出码、六页面检查结果、十一类弹层检查结果、四个视口、键盘与减少动态效果、构建分包、控制台错误数量，以及发现并修复的问题对应提交。

- [ ] **Step 7: 运行最终证据命令**

Run: `pnpm test`

Run: `pnpm test:e2e`

Run: `pnpm typecheck`

Run: `pnpm build`

Run: `git status --short`

Expected: unit and E2E suites PASS; production build exits 0; working tree only contains intentionally uncommitted audit artifacts or is clean.

- [ ] **Step 8: 提交**

```bash
git add playwright.config.ts e2e docs/verification src
git commit -m "test: verify terminal prototype end to end"
```

---

## 完成判定

只有当 Task 1–11 全部完成、最终证据命令通过、浏览器视觉检查覆盖全部六个页面和关键弹层、规格中的显式要求均能指向文件或运行行为证据时，才能宣称前端原型完成。
