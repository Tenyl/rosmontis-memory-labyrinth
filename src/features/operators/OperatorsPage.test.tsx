import { act, screen, within } from '@testing-library/react';
import { renderApp } from '../../test/renderApp';
import { useGameStore } from '../../store/gameStore';
import { projectTavernTurn } from '../tavern/projection/tavern-turn-projector';

test('只显示迷迭香状态和空白立绘', async () => {
  renderApp('/operators');
  await screen.findByRole('heading', { level: 1, name: '迷迭香状态' });

  const profile = screen.getByRole('article', { name: '迷迭香' });
  expect(within(profile).getByRole('img', { name: '迷迭香立绘占位' })).toHaveAttribute(
    'src',
    '/assets/characters/blank-character.svg',
  );
  expect(within(profile).getByText('理智稳定度')).toBeVisible();
  expect(within(profile).getByText('72%')).toBeVisible();
  expect(within(profile).getByText('精神负荷')).toBeVisible();
  expect(within(profile).getByText('41 / 100')).toBeVisible();
  expect(within(profile).getByRole('meter', { name: '迷迭香精神负荷' })).toHaveAttribute('aria-valuenow', '41');
  expect(within(profile).getByText('轻度意识重叠')).toBeVisible();
  expect(screen.queryByText('随行小队')).not.toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: '角色与身份' })).not.toBeInTheDocument();
});

test('显示由会话回合更新的精神负荷来源', async () => {
  renderApp('/operators');
  await screen.findByRole('heading', { name: '迷迭香状态' });
  await screen.findByRole('button', { name: /当前会话：雨幕回声/ });
  const events = projectTavernTurn({ sessionId: 'chat-rain-echo', messageId: 'msg-stress-source', summary: '负荷变化', variables: { rosmontis_stress: 47 }, previousVariables: { rosmontis_stress: 39 } });
  act(() => {
    useGameStore.getState().activateTavernProjection('chat-rain-echo');
    useGameStore.getState().applyTavernEvents(events, 'chat-rain-echo');
  });
  expect(await screen.findByText('47 / 100')).toBeVisible();
  expect(await screen.findByRole('link', { name: /打开来自会话雨幕回声的来源回合/ })).toBeVisible();
});
