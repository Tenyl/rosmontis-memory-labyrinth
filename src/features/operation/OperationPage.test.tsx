import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useGameStore } from '../../store/gameStore';
import { renderApp } from '../../test/renderApp';

test('只显示迷迭香的行动资源与认知链路状态', async () => {
  renderApp('/operation');

  expect(await screen.findByRole('heading', { name: '迷迭香行动资源' })).toBeVisible();
  expect(screen.getByText('RSM-04 / 迷迭香')).toBeVisible();
  expect(document.body).not.toHaveTextContent(/小队|名干员/);
});

test('executes a legal offline greatsword action through the Run store', async () => {
  const user = userEvent.setup();
  renderApp('/operation');

  await user.click(await screen.findByRole('button', { name: /守望.*实体屏障/ }));

  expect(useGameStore.getState().rosmontis).toMatchObject({ actionPoints: 3, overload: 5, guard: 24 });
  expect(screen.getByText('守望已执行 · -1 AP · +5% 过载 · 冷却 1')).toBeVisible();
});

test('settles the current node through its dedicated encounter choices', async () => {
  const user = userEvent.setup();
  renderApp('/operation');

  await user.click(await screen.findByRole('button', { name: /稳定认知/ }));

  expect(useGameStore.getState().pendingEncounter).toMatchObject({ kind: 'safehouse', resolved: true });
  expect(useGameStore.getState().maze.nodes.find((node) => node.id === useGameStore.getState().run.currentNodeId)).toMatchObject({ state: 'completed' });
  expect(screen.getByText('结算完成')).toBeVisible();
});

test('uses a sword card as the only damage command in the fifth-floor boss encounter', async () => {
  const user = userEvent.setup();
  renderApp('/operation');
  await screen.findByRole('heading', { name: '作战主控台' });
  act(() => useGameStore.setState((state) => ({
    run: { ...state.run, floor: 5, maxFloor: 5 },
    maze: {
      ...state.maze,
      floor: 5,
      maxFloor: 5,
      nodes: state.maze.nodes.map((node) => node.id === state.run.currentNodeId ? { ...node, type: 'boss' as const, risk: 'S' as const } : node),
    },
    rosmontis: {
      ...state.rosmontis,
      actionPoints: 4,
      greatswords: { breach: { cooldown: 0 }, watch: { cooldown: 0 }, perception: { cooldown: 0 }, resonance: { cooldown: 0 } },
    },
    pendingEncounter: {
      kind: 'boss', bossKind: 'closed-heart', nodeId: state.run.currentNodeId, resolved: false,
      phase: 'shield', enemyIntegrity: 80, coreStability: 0, glitch: false, choices: [],
    },
  })));

  expect(await screen.findByRole('heading', { name: '阶段一：破除心防' })).toBeVisible();
  expect(document.querySelector('#btn-encounter-boss-breach')).toBeNull();
  await user.click(screen.getByRole('button', { name: /破壁.*破甲粉碎/ }));
  expect(useGameStore.getState().pendingEncounter).toMatchObject({ kind: 'boss', enemyIntegrity: 50, phase: 'shield' });
  expect(screen.getByText('50 / 80')).toBeVisible();
});

test('validates an empty command inline and completes a Tavern runtime turn', async () => {
  renderApp('/operation');
  await screen.findByRole('heading', { name: '作战主控台' });
  const user = userEvent.setup();

  await user.click(await screen.findByRole('button', { name: '发送战术指令' }));
  expect(screen.getByText('请输入行动描述，或从上方选择一项建议')).toBeVisible();

  await user.click(screen.getByRole('button', { name: '让迷迭香读取残留意识' }));
  await user.click(screen.getByRole('button', { name: '发送战术指令' }));

  expect((await screen.findAllByRole('button', { name: /^选择：/ }, { timeout: 2_500 })).length).toBeGreaterThan(0);
  expect((await screen.findAllByText('回合完成')).length).toBeGreaterThanOrEqual(1);

  await user.click(await screen.findByRole('link', { name: /打开来自会话雨幕回声的来源回合/ }));
  const history = await screen.findByRole('dialog', { name: '历史记录' });
  expect(history).toHaveTextContent(/反复翻转的 R-09 门牌|玻璃思维温室/);
  await waitFor(() => expect(history.querySelector('.is-source-focus')).toHaveFocus());
});

test('executes a recognized local command and recovers from an unknown command without guessing', async () => {
  renderApp('/operation');
  await screen.findByRole('heading', { name: '作战主控台' });
  const user = userEvent.setup();
  const input = await screen.findByRole('textbox', { name: '战术指令' });

  await user.type(input, '命令巨剑进入守望阵位');
  await user.click(screen.getByRole('button', { name: '发送战术指令' }));
  await waitFor(() => expect(useGameStore.getState().rosmontis).toMatchObject({ actionPoints: 3, guard: 24 }));

  await waitFor(() => expect(input).not.toBeDisabled(), { timeout: 2_500 });
  await user.type(input, '向不存在的月亮唱歌');
  await user.click(screen.getByRole('button', { name: '发送战术指令' }));

  expect(await screen.findByRole('article', { name: '警告：离线指令未识别' })).toHaveTextContent('让迷迭香短暂休整');
  expect(useGameStore.getState().rosmontis).toMatchObject({ actionPoints: 3, guard: 24 });
});
