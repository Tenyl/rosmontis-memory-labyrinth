import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { buildDemoState } from '../../data/demoData';
import {
  clearAllData,
  getChats,
  getSettings,
  initializeDatabase,
  saveSettings,
} from '../../sillytavern/database';
import { useGameStore } from '../../store/gameStore';
import { TavernProvider } from '../tavern/runtime/TavernProvider';
import type { TavernTransport } from '../tavern/runtime/tavern-transport';
import RosmontisChatPage from './RosmontisChatPage';

const remoteTransport: TavernTransport = {
  mode: 'remote',
  async *stream() {
    yield '<maintext>博士，我在。这里没有战斗，只是我们两个人说话。</maintext>';
    yield '<sum>迷迭香回应了博士</sum><vars>{"sanity":1}</vars>';
  },
};

beforeEach(async () => {
  await clearAllData();
  useGameStore.setState(buildDemoState());
});

afterEach(async () => {
  await clearAllData();
});

function renderPage(transport?: TavernTransport) {
  return render(
    <MemoryRouter>
      <TavernProvider transport={transport}>
        <RosmontisChatPage />
      </TavernProvider>
    </MemoryRouter>,
  );
}

test('shows only a settings path when no remote LLM is configured', async () => {
  renderPage();

  expect(await screen.findByRole('heading', { name: '迷迭香对话' })).toBeVisible();
  expect(screen.getByRole('link', { name: '前往接口设置' })).toHaveAttribute('href', '/settings');
  expect(screen.queryByRole('textbox', { name: '发送给迷迭香' })).not.toBeInTheDocument();
});

test('creates an isolated character chat, streams the reply, and supports branching', async () => {
  await initializeDatabase();
  const settings = await getSettings();
  if (!settings) throw new Error('测试设置未初始化');
  await saveSettings({ ...settings, api: { ...settings.api, apiKey: 'remote-test-key' } });
  const before = useGameStore.getState().rosmontis;
  const user = userEvent.setup();
  renderPage(remoteTransport);

  const input = await screen.findByRole('textbox', { name: '发送给迷迭香' });
  await user.type(input, '你还好吗？');
  await user.click(screen.getByRole('button', { name: '发送消息' }));

  await waitFor(() => {
    expect(screen.getByRole('button', { name: '重试' })).toBeEnabled();
    expect(screen.getByText('博士，我在。这里没有战斗，只是我们两个人说话。')).toBeVisible();
  });
  await waitFor(async () => {
    const chats = (await getChats()).filter((chat) => chat.purpose === 'character-chat');
    expect(chats).toHaveLength(1);
    expect(chats[0]).toMatchObject({ purpose: 'character-chat', runId: null });
  });
  expect(useGameStore.getState().rosmontis).toEqual(before);

  await act(async () => {
    await user.click(screen.getByRole('button', { name: '从当前回复创建分支' }));
  });
  await waitFor(async () => {
    const chats = (await getChats()).filter((chat) => chat.purpose === 'character-chat');
    expect(chats).toHaveLength(2);
  });
});
