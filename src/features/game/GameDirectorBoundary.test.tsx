import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderPlayableApp } from '../../test/renderApp';
import { useGameStore } from '../../store/gameStore';
import { clearAllData, getChats, getSettings, initializeDatabase, saveChat, saveSettings } from '../../sillytavern/database';
import { DEFAULT_CHARACTER_ID, DEFAULT_PERSONA_ID, DEFAULT_PRESET_ID } from '../../sillytavern/default-content';
import { TavernProvider } from '../tavern/runtime/TavernProvider';
import type { TavernTransport } from '../tavern/runtime/tavern-transport';
import { GameDirectorBoundary } from './GameDirectorBoundary';

beforeEach(async () => {
  await clearAllData();
});

afterEach(async () => {
  await clearAllData();
});

test('keeps AI mode in the same node template and shows one fused director capability slot', async () => {
  renderPlayableApp('/game', () => {
    useGameStore.getState().startRun('AI-SHARED', 'preset', true, false, {
      contentMode: 'ai-director',
      aiFailurePolicy: 'ask',
    });
  });

  expect(await screen.findByTestId('shared-node-template')).toBeVisible();
  expect(document.querySelectorAll('#game-encounter-panel')).toHaveLength(1);
  expect(document.getElementById('game-director-status')).toBeVisible();
  expect(document.getElementById('game-ai-command-slot')).toBeVisible();
  expect(document.getElementById('llm-independent-event')).toBeNull();
  expect(document.querySelector('.tavern-game-view')).toBeNull();

  fireEvent.click(await screen.findByRole('button', { name: '本节点使用本地内容' }));
  expect(useGameStore.getState().llmDirector.presentations[`${useGameStore.getState().run.id}:${useGameStore.getState().run.currentNodeId}`]?.source).toBe('local-fallback');
});

test('fuses a validated remote presentation from the bound Tavern session', async () => {
  useGameStore.getState().resetDemoState();
  useGameStore.getState().startRun('AI-BOUND', 'preset', true, false, {
    contentMode: 'ai-director',
    aiFailurePolicy: 'auto-fallback',
  });
  const state = useGameStore.getState();
  const node = state.maze.nodes.find((item) => item.id === state.run.currentNodeId)!;
  await initializeDatabase();
  const settings = (await getSettings())!;
  const session = (await getChats())[0];
  await saveChat({
    ...session,
    purpose: 'game-run',
    runId: state.run.id,
    summaries: [{
      triggerKey: 'node:bound:previous', kind: 'node', runId: state.run.id, floor: 1,
      nodeId: 'previous', text: '绑定存档摘要：雨声已经远去。', createdAt: '2026-08-31T12:00:00.000Z',
    }],
  });
  const distractor = {
    ...session,
    id: 'chat-selected-elsewhere',
    name: '设置页当前会话',
    purpose: 'character-chat' as const,
    runId: null,
    summaries: [{ triggerKey: 'wrong', kind: 'node' as const, runId: 'other', floor: 9, text: '错误会话摘要', createdAt: '2026-08-31T12:00:00.000Z' }],
  };
  await saveChat(distractor);
  await saveSettings({
    ...settings,
    activeChatId: distractor.id,
    api: { ...settings.api, apiKey: 'sk-test', model: 'test-model' },
  });
  useGameStore.setState((current) => ({
    run: {
      ...current.run,
      aiBinding: {
        chatId: session.id,
        characterId: DEFAULT_CHARACTER_ID,
        personaId: DEFAULT_PERSONA_ID,
        presetId: DEFAULT_PRESET_ID,
        lorebookIds: [...session.lorebookIds],
      },
    },
  }));
  let promptText = '';
  const transport: TavernTransport = {
    mode: 'remote',
    async *stream(request) {
      promptText = request.messages.map((message) => message.content).join('\n');
      yield JSON.stringify({
        version: 1, nodeId: node.id, nodeType: node.type, title: 'AI 融合休息处',
        description: '世界书中的雨声在同一个节点模板内展开。',
        choiceIds: ['rest-stabilize', 'rest-vent'], modifierIds: [], quote: '我听见雨声了。',
      });
    },
  };
  const boundRun = useGameStore.getState().run;

  render(
    <TavernProvider transport={transport}>
      <GameDirectorBoundary run={boundRun} node={node}>
        {(presentation) => <article data-testid="remote-presentation">{presentation.title}</article>}
      </GameDirectorBoundary>
    </TavernProvider>,
  );

  expect(await screen.findByText('AI 融合休息处')).toBeVisible();
  await waitFor(() => expect(useGameStore.getState().llmDirector.presentations[`${boundRun.id}:${node.id}`]).toMatchObject({
    source: 'ai-director', title: 'AI 融合休息处',
  }));
  expect(promptText).toContain('绑定存档摘要：雨声已经远去。');
  expect(promptText).not.toContain('错误会话摘要');
});
