import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { clearAllData } from '../../../sillytavern/database';
import { useGameStore } from '../../../store/gameStore';
import { TavernProvider } from '../runtime/TavernProvider';
import type { TavernTransport } from '../runtime/tavern-transport';
import { TavernGameView } from './TavernGameView';

beforeEach(async () => {
  await clearAllData();
  useGameStore.getState().resetDemoState();
});
afterEach(async () => clearAllData());

function renderGame(transport: TavernTransport) {
  return render(<MemoryRouter initialEntries={['/operation']}><TavernProvider transport={transport}><TavernGameView /></TavernProvider></MemoryRouter>);
}

test('流式显示正文，闭合后呈现选项，并默认折叠思考过程', async () => {
  const transport: TavernTransport = { mode: 'local', async *stream() { yield '<thinking>分析声源</thinking><maintext>雨幕中出现'; yield '三条路径。</maintext><option>检查门牌\n呼叫小队</option><sum>发现路径</sum>'; } };
  const user = userEvent.setup();
  renderGame(transport);
  const input = await screen.findByLabelText('战术指令');
  await user.type(input, '观察走廊');
  await user.click(screen.getByRole('button', { name: '发送战术指令' }));

  expect(await screen.findByText('雨幕中出现三条路径。')).toBeVisible();
  expect(screen.getByRole('button', { name: '选择：检查门牌' })).toBeVisible();
  expect(screen.queryByText('分析声源')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '展开思考过程' })).toHaveAttribute('aria-expanded', 'false');
});

test('回合完成后只将保留的角色变量投影到战术状态', async () => {
  const transport: TavernTransport = {
    mode: 'local',
    async *stream() {
      yield '<maintext>记忆节点已显现。</maintext><option>继续扫描</option><sum>发现沉没诊疗层</sum><vars>{"rosmontis_stress":47,"memory_node_title":"沉没诊疗层","memory_node_risk":"A","clue_title":"被涂改的病历"}</vars>';
    },
  };
  const user = userEvent.setup();
  renderGame(transport);
  await user.type(await screen.findByLabelText('战术指令'), '读取残留意识');
  await user.click(screen.getByRole('button', { name: '发送战术指令' }));
  await screen.findByText('记忆节点已显现。');

  await waitFor(() => expect(useGameStore.getState().operators.byId.rosmontis.stress).toBe(47));
  expect(useGameStore.getState()).not.toHaveProperty('memoryMap');
  expect(useGameStore.getState()).not.toHaveProperty('archive');
  expect(useGameStore.getState()).not.toHaveProperty('actionLog');
});

test('数字快捷键只填入选项，不会自动提交', async () => {
  let requests = 0;
  const transport: TavernTransport = { mode: 'local', async *stream() { requests += 1; yield '<maintext>选择路线。</maintext><option>进入东翼\n返回舰桥</option><sum>等待选择</sum>'; } };
  const user = userEvent.setup();
  renderGame(transport);
  const input = await screen.findByLabelText('战术指令');
  await user.type(input, '请求路线');
  await user.click(screen.getByRole('button', { name: '发送战术指令' }));
  await screen.findByRole('button', { name: '选择：进入东翼' });
  await user.keyboard('1');
  expect(input).toHaveValue('进入东翼');
  expect(requests).toBe(1);
});

test('可停止生成并重试上一轮', async () => {
  let requests = 0;
  const transport: TavernTransport = {
    mode: 'local',
    async *stream(_request, signal) {
      requests += 1;
      if (requests === 1) {
        yield '<maintext>信号正在延伸';
        await new Promise<void>((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
      } else {
        yield '<maintext>链路已恢复。</maintext><option>继续</option><sum>恢复</sum>';
      }
    },
  };
  const user = userEvent.setup();
  renderGame(transport);
  await user.type(await screen.findByLabelText('战术指令'), '深入连接');
  await user.click(screen.getByRole('button', { name: '发送战术指令' }));
  await screen.findByText(/信号正在延伸/);
  await user.click(screen.getByRole('button', { name: '停止生成' }));
  expect(await screen.findByText('生成已中断')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '重试上一轮' }));
  expect(await screen.findByText('链路已恢复。')).toBeVisible();
  expect(requests).toBe(2);
});

test('历史抽屉可编辑用户消息并从该处重新生成', async () => {
  const prompts: string[] = [];
  const transport: TavernTransport = { mode: 'local', async *stream(request) { prompts.push(request.messages.at(-1)?.content ?? ''); yield '<maintext>已记录。</maintext><option>继续</option><sum>记录</sum>'; } };
  const user = userEvent.setup();
  renderGame(transport);
  await user.type(await screen.findByLabelText('战术指令'), '检查门牌');
  await user.click(screen.getByRole('button', { name: '发送战术指令' }));
  await screen.findByText('已记录。');
  await user.click(screen.getByRole('button', { name: /打开历史记录/ }));
  const history = screen.getByRole('dialog', { name: '历史记录' });
  await user.click(within(history).getByRole('button', { name: '编辑消息：检查门牌' }));
  const editor = screen.getByLabelText('编辑后的消息内容');
  await user.clear(editor);
  await user.type(editor, '检查门牌背面');
  await user.click(screen.getByRole('button', { name: '保存并重新生成' }));
  await waitFor(() => expect(prompts).toHaveLength(2));
  expect(prompts[1]).toBe('检查门牌背面');
  await waitFor(() => expect(within(history).queryByText('检查门牌')).not.toBeInTheDocument());
  expect(within(history).getByText('检查门牌背面')).toBeVisible();
});
