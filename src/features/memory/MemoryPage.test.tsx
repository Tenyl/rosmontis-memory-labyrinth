import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test/renderApp';
import { useGameStore } from '../../store/gameStore';
import { projectTavernTurn } from '../tavern/projection/tavern-turn-projector';

test('shows the three surface nodes with tactical metadata', async () => {
  renderApp('/memory');

  expect(await screen.findByRole('button', { name: /雨幕中的疗养院.*危险 B.*敌对 3/ })).toBeVisible();
  expect(screen.getByRole('button', { name: /无声候车厅.*危险 C.*敌情未知/ })).toBeVisible();
  expect(screen.getByRole('button', { name: /编号 R-09 隔离室.*危险 A/ })).toBeVisible();
});

test.each(['向下拓建', '向左拓建', '向右拓建'])('expands with %s after confirmation', async (label) => {
  const user = userEvent.setup();
  renderApp('/memory');

  await user.click(await screen.findByRole('button', { name: /编号 R-09 隔离室.*危险 A/ }));
  await user.click(screen.getByRole('button', { name: label }));
  await user.click(screen.getByRole('button', { name: '确认拓建' }));

  expect(screen.getByText(/路径已建立/)).toBeVisible();
});

test('展示 LLM 新建节点的会话回合来源', async () => {
  const user = userEvent.setup();
  renderApp('/memory');
  await screen.findByRole('heading', { name: '意识战场' });
  await screen.findByRole('button', { name: /当前会话：雨幕回声/ });
  const events = projectTavernTurn({ sessionId: 'chat-rain-echo', messageId: 'msg-memory-source', summary: '发现节点', variables: { memory_node_title: '沉没诊疗层', memory_node_risk: 'A' }, previousVariables: {} });
  act(() => {
    useGameStore.getState().activateTavernProjection('chat-rain-echo');
    useGameStore.getState().applyTavernEvents(events, 'chat-rain-echo');
  });
  await user.click(await screen.findByRole('button', { name: /沉没诊疗层.*危险 A/ }));
  expect(await screen.findByRole('link', { name: /打开来自会话雨幕回声的来源回合/ })).toBeVisible();
});
