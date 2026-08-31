import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createEncounter } from '../../game/encounters';
import type { MazeNode } from '../../game/types';
import type { NodePresentation } from '../../llm/schemas/gameDirectorV1';
import { clearAllData, getChats, getSettings, initializeDatabase, saveChat, saveSettings } from '../../sillytavern/database';
import { DEFAULT_CHARACTER_ID, DEFAULT_PERSONA_ID, DEFAULT_PRESET_ID } from '../../sillytavern/default-content';
import { useGameStore } from '../../store/gameStore';
import { TavernProvider } from '../tavern/runtime/TavernProvider';
import type { TavernTransport } from '../tavern/runtime/tavern-transport';
import { useTavern } from '../tavern/runtime/useTavern';
import { AiTacticalCommandConsole } from './AiTacticalCommandConsole';

beforeEach(async () => {
  await clearAllData();
  useGameStore.getState().resetDemoState();
});

afterEach(async () => {
  await clearAllData();
});

test('translates a remote plan and settles its complete action sequence locally', async () => {
  useGameStore.getState().startRun('AI-COMMAND', 'preset', true, false, { contentMode: 'ai-director' });
  const initial = useGameStore.getState();
  const node: MazeNode = { ...initial.maze.nodes[0], type: 'combat', hiddenType: null, revealed: true };
  const encounterState = createEncounter({
    ...initial,
    maze: { ...initial.maze, nodes: [node, ...initial.maze.nodes.slice(1)] },
    pendingEncounter: null,
  }, node);
  useGameStore.setState(encounterState);

  await initializeDatabase();
  const settings = (await getSettings())!;
  await saveSettings({ ...settings, api: { ...settings.api, apiKey: 'sk-test', model: 'test-model' } });
  const session = (await getChats())[0];
  await saveChat({ ...session, purpose: 'game-run', runId: encounterState.run.id });
  useGameStore.setState((state) => ({
    run: {
      ...state.run,
      aiBinding: {
        chatId: session.id, characterId: DEFAULT_CHARACTER_ID, personaId: DEFAULT_PERSONA_ID,
        presetId: DEFAULT_PRESET_ID, lorebookIds: [...session.lorebookIds],
      },
    },
  }));
  const run = useGameStore.getState().run;
  const presentation: NodePresentation = {
    version: 1, runId: run.id, nodeId: node.id, nodeType: 'combat', source: 'ai-director',
    title: '残响', description: '敌方正在蓄力。', choiceIds: ['combat-breach', 'combat-guard'],
    modifierIds: [], enemyPlan: { intentIds: ['charge'] }, quote: '我准备好了。',
  };
  const transport: TavernTransport = {
    mode: 'remote',
    async *stream() {
      yield '{"version":1,"actionIds":["sword:watch","sword:breach"],"explanation":"先建立屏障，再用破壁压制。"}';
    },
  };

  function Harness() {
    const runtime = useTavern();
    return runtime.initialized ? <AiTacticalCommandConsole run={run} node={node} presentation={presentation} /> : <span>载入</span>;
  }
  render(<TavernProvider transport={transport}><Harness /></TavernProvider>);

  const input = await screen.findByRole('textbox', { name: '战术指令' });
  expect(screen.getByText(/最终动作仍由本地规则校验/)).toBeVisible();
  fireEvent.change(input, { target: { value: '先用守望防御，再以破壁攻击。' } });
  fireEvent.click(screen.getByRole('button', { name: /发送战术指令/ }));

  await waitFor(() => expect(useGameStore.getState().pendingEncounter).toMatchObject({ kind: 'combat', enemyIntegrity: 50 }));
  expect(useGameStore.getState().rosmontis.actionPoints).toBe(1);
  expect(await screen.findByText('先建立屏障，再用破壁压制。')).toBeVisible();
});
