import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NotificationItem } from '../types/game';
import { useGameStore } from '../store/gameStore';
import { NotificationCenter } from './NotificationCenter';

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

test('renders store notifications and dismisses them in-app', async () => {
  const user = userEvent.setup();
  useGameStore.getState().resetDemoState();
  useGameStore.getState().addNotification({
    id: 'notification-anchor-ready',
    kind: 'success',
    title: '意识锚点已建立',
    message: '雨幕中的疗养院路径现已稳定。',
    dismissible: true,
  });

  render(<NotificationCenter />);
  await user.click(screen.getByRole('button', { name: '关闭通知：意识锚点已建立' }));

  expect(screen.queryByText('雨幕中的疗养院路径现已稳定。')).not.toBeInTheDocument();
});
