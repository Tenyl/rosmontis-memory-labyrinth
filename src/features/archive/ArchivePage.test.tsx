import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test/renderApp';
import { useGameStore } from '../../store/gameStore';
import { projectTavernTurn } from '../tavern/projection/tavern-turn-projector';

test('filters completed archive records by kind', async () => {
  const user = userEvent.setup();
  renderApp('/archive');

  expect(await screen.findByText('潮湿的儿童病历')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '人物' }));
  expect(screen.getByText('没有倒影的护理员伊莲')).toBeVisible();
  expect(screen.queryByText('潮湿的儿童病历')).not.toBeInTheDocument();
});

test('builds a hypothesis from pinned evidence and exposes conflicts', async () => {
  const user = userEvent.setup();
  renderApp('/archive');

  await user.click(await screen.findByRole('button', { name: /钉选潮湿的儿童病历/ }));
  await user.click(screen.getByRole('tab', { name: '推理台' }));
  expect(screen.getByText('支持证据')).toBeVisible();
  expect(screen.getByText('冲突证据')).toBeVisible();
});

test('opens worldbook management inside the archive route', async () => {
  const user = userEvent.setup();
  renderApp('/archive');
  await user.click(await screen.findByRole('tab', { name: '世界书' }));
  expect(await screen.findByRole('heading', { name: '世界书索引' })).toBeVisible();
  expect(screen.getByText('罗德岛行动协议')).toBeVisible();
  expect(window.location.pathname).toBe('/archive');
});

test('自动建档 LLM 线索并保留回合来源', async () => {
  renderApp('/archive');
  await screen.findByRole('heading', { name: '情报档案库' });
  const events = projectTavernTurn({ sessionId: 'chat-rain-echo', messageId: 'msg-clue-source', summary: '发现线索', variables: { clue_title: '被涂改的病历' }, previousVariables: {} });
  act(() => {
    useGameStore.getState().activateTavernProjection('chat-rain-echo');
    useGameStore.getState().applyTavernEvents(events, 'chat-rain-echo');
  });
  expect(await screen.findByText('被涂改的病历')).toBeVisible();
  expect(await screen.findByRole('link', { name: /打开来自会话雨幕回声的来源回合/ })).toBeVisible();
});
