import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../test/renderApp';
import { useGameStore } from '../../store/gameStore';
import { projectTavernTurn } from '../tavern/projection/tavern-turn-projector';

test('renders Rosmontis RPG statistics and current condition', async () => {
  renderApp('/operators');
  await screen.findByRole('heading', { name: '干员与小队' });

  const profile = screen.getByRole('article', { name: '迷迭香' });
  expect(within(profile).getByText('理智稳定度')).toBeVisible();
  expect(within(profile).getByText('72%')).toBeVisible();
  expect(within(profile).getByText('精神负荷')).toBeVisible();
  expect(within(profile).getByText('41 / 100')).toBeVisible();
  expect(within(profile).getByRole('meter', { name: '迷迭香精神负荷' })).toHaveAttribute('aria-valuenow', '41');
  expect(within(profile).getByText('轻度意识重叠')).toBeVisible();
});

test('opens a completed squad dossier', async () => {
  const user = userEvent.setup();
  renderApp('/operators');

  await user.click(await screen.findByRole('button', { name: '查看阿米娅完整档案' }));
  const dialog = screen.getByRole('dialog', { name: '阿米娅战术档案' });
  expect(dialog).toBeVisible();
  expect(within(dialog).getByText('下一行动')).toBeVisible();
});

test('opens the role and persona workspace without changing route', async () => {
  const user = userEvent.setup();
  renderApp('/operators');
  await user.click(await screen.findByRole('tab', { name: '角色与身份' }));
  expect(await screen.findByRole('heading', { name: '角色与身份' })).toBeVisible();
  expect(screen.getByRole('article', { name: '角色卡 迷迭香' })).toBeVisible();
  expect(window.location.pathname).toBe('/operators');
});

test('显示由会话回合更新的精神负荷来源', async () => {
  renderApp('/operators');
  await screen.findByRole('heading', { name: '干员与小队' });
  const events = projectTavernTurn({ sessionId: 'chat-rain-echo', messageId: 'msg-stress-source', summary: '负荷变化', variables: { rosmontis_stress: 47 }, previousVariables: { rosmontis_stress: 39 } });
  act(() => {
    useGameStore.getState().activateTavernProjection('chat-rain-echo');
    useGameStore.getState().applyTavernEvents(events, 'chat-rain-echo');
  });
  expect(await screen.findByText('47 / 100')).toBeVisible();
  expect(await screen.findByRole('link', { name: /打开来自会话雨幕回声的来源回合/ })).toBeVisible();
});
