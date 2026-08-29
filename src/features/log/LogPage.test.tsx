import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test/renderApp';
import { useGameStore } from '../../store/gameStore';
import { projectTavernTurn } from '../tavern/projection/tavern-turn-projector';

test('filters the action timeline and opens source replay', async () => {
  const user = userEvent.setup();
  renderApp('/log');

  await user.click(await screen.findByRole('button', { name: '仅显示检定' }));
  await user.click(screen.getByRole('button', { name: /打开感知检定详情/ }));
  expect(screen.getByRole('dialog', { name: '剧情回溯' })).toBeVisible();
});

test('行动时间线可追溯酒馆回合', async () => {
  renderApp('/log');
  await screen.findByRole('heading', { name: '行动记录' });
  const events = projectTavernTurn({ sessionId: 'chat-rain-echo', messageId: 'msg-log-source', summary: '发现儿童意识回声', variables: {}, previousVariables: {} });
  act(() => {
    useGameStore.getState().activateTavernProjection('chat-rain-echo');
    useGameStore.getState().applyTavernEvents(events, 'chat-rain-echo');
  });
  expect(await screen.findByText('发现儿童意识回声')).toBeVisible();
  expect(await screen.findByRole('link', { name: /打开来自会话雨幕回声的来源回合/ })).toBeVisible();
});
