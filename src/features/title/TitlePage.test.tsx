import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { useGameStore } from '../../store/gameStore';
import { clearAllData, getChats, getSettings, initializeDatabase, saveSettings } from '../../sillytavern/database';
import { loadSaveSlot } from '../../game/saveSlots';

beforeEach(async () => clearAllData());
afterEach(async () => clearAllData());

test('opens on the title screen with continue disabled when no save exists', async () => {
  renderApp('/');

  expect(await screen.findByRole('heading', { name: '迷迭香的记忆迷宫' })).toBeVisible();
  expect(screen.getByRole('button', { name: '继续游戏' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '开始游戏' })).toBeEnabled();
});

test('starts a new run in a chosen slot and waits for the player to select the first node', async () => {
  renderApp('/');
  fireEvent.click(await screen.findByRole('button', { name: '开始游戏' }));
  fireEvent.click(screen.getByRole('button', { name: /存档槽 1/ }));

  expect(await screen.findByRole('region', { name: '记忆迷宫' })).toBeVisible();
  expect(window.location.pathname).toBe('/game');
  expect(useGameStore.getState().pendingEncounter).toBeNull();
  expect(useGameStore.getState().maze.nodes.filter((node) => node.state === 'reachable').length).toBeGreaterThanOrEqual(2);
});

test('offers the shared local template and locks AI direction while no LLM is connected', async () => {
  renderApp('/');
  fireEvent.click(await screen.findByRole('button', { name: '开始游戏' }));

  expect(screen.getByRole('radio', { name: /^本地规则模式/ })).toBeEnabled();
  expect(screen.getByRole('radio', { name: /^AI 导演模式/ })).toBeDisabled();
});

test('unlocks local endless mode on the opening screen after the first clear', async () => {
  renderApp('/');
  useGameStore.setState({ progression: { firstClear: true, completedRuns: 1 } });
  fireEvent.click(await screen.findByRole('button', { name: '开始游戏' }));

  expect(document.querySelector('#title-mode-endless')).toBeEnabled();
});

test('creates one distinct bound game-run chat per AI save and none for a local save', async () => {
  await initializeDatabase();
  const settings = await getSettings();
  if (!settings) throw new Error('测试设置未初始化');
  await saveSettings({ ...settings, api: { ...settings.api, apiKey: 'bound-run-key' } });

  const first = renderApp('/');
  fireEvent.click(await screen.findByRole('button', { name: '开始游戏' }));
  await waitFor(() => expect(screen.getByRole('radio', { name: /^AI 导演模式/ })).toBeEnabled());
  fireEvent.click(screen.getByRole('radio', { name: /^AI 导演模式/ }));
  fireEvent.click(screen.getByRole('button', { name: /存档槽 1/ }));
  await waitFor(() => expect(window.location.pathname).toBe('/game'));
  const rawFirstSlot = JSON.parse(localStorage.getItem('rosmontis-run-save-slots') ?? '{}') as {
    'slot-1'?: { state?: { run?: { id?: string; aiBinding?: { chatId?: string | null } } } };
  };
  expect(rawFirstSlot['slot-1']?.state?.run?.aiBinding?.chatId).toBeTruthy();
  const migratedFirstSlot = loadSaveSlot('slot-1', localStorage);
  expect(migratedFirstSlot?.state.run.id).toBe(rawFirstSlot['slot-1']?.state?.run?.id);
  const firstBinding = migratedFirstSlot?.state.run.aiBinding.chatId;
  expect(firstBinding).toBeTruthy();
  first.unmount();

  const second = renderApp('/');
  fireEvent.click(await screen.findByRole('button', { name: '开始游戏' }));
  await waitFor(() => expect(screen.getByRole('radio', { name: /^AI 导演模式/ })).toBeEnabled());
  fireEvent.click(screen.getByRole('radio', { name: /^AI 导演模式/ }));
  fireEvent.click(screen.getByRole('button', { name: /存档槽 2/ }));
  await waitFor(() => expect(window.location.pathname).toBe('/game'));
  const secondBinding = loadSaveSlot('slot-2', localStorage)?.state.run.aiBinding.chatId;
  expect(secondBinding).toBeTruthy();
  expect(secondBinding).not.toBe(firstBinding);
  second.unmount();

  const third = renderApp('/');
  fireEvent.click(await screen.findByRole('button', { name: '开始游戏' }));
  fireEvent.click(screen.getByRole('button', { name: /存档槽 3/ }));
  await waitFor(() => expect(window.location.pathname).toBe('/game'));

  const gameChats = (await getChats()).filter((chat) => chat.purpose === 'game-run' && chat.runId?.startsWith('RUN-'));
  expect(gameChats.map((chat) => chat.id).sort()).toEqual([firstBinding, secondBinding].sort());
  expect(loadSaveSlot('slot-3', localStorage)?.state.run.aiBinding.chatId).toBeNull();
  third.unmount();
});
