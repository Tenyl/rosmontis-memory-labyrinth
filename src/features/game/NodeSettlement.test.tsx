import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PendingEncounter } from '../../game/types';
import { buildDemoState } from '../../data/demoData';
import { clearAllData, getChats, initializeDatabase, saveChat } from '../../sillytavern/database';
import { TavernProvider } from '../tavern/runtime/TavernProvider';
import { NodeSettlement } from './NodeSettlement';

beforeEach(async () => clearAllData());
afterEach(async () => clearAllData());

test('shows the gains and losses from a completed combat encounter', () => {
  const encounter: PendingEncounter = {
    kind: 'combat', nodeId: 'combat-result', resolved: true, round: 3, maxRounds: 4,
    enemyIntegrity: 0, rewardEchoes: 8, choices: [],
    entrySnapshot: { sanity: 100, overload: 10, echoes: 2, fragments: 0 },
  };

  render(<NodeSettlement
    encounter={encounter}
    sanity={92}
    overload={20}
    echoes={10}
    fragmentCount={1}
  />);

  expect(screen.getByRole('heading', { name: '节点结算完成' })).toBeVisible();
  expect(screen.getByText('稳定性 -8')).toBeVisible();
  expect(screen.getByText('过载 +10%')).toBeVisible();
  expect(screen.getByText('记忆残响 +8')).toBeVisible();
  expect(screen.getByText('记忆碎片 +1')).toBeVisible();
  expect(screen.getByText('完成回合 3')).toBeVisible();
});

test('offers an immediate next-floor action when the exit node is settled', async () => {
  const onAdvanceFloor = vi.fn();
  const encounter: PendingEncounter = {
    kind: 'safehouse', nodeId: 'exit', resolved: true, choices: [],
  };
  render(<NodeSettlement encounter={encounter} sanity={100} overload={0} echoes={0} fragmentCount={0} canAdvanceFloor onAdvanceFloor={onAdvanceFloor} />);

  await userEvent.click(screen.getByRole('button', { name: '进入下一层迷宫' }));
  expect(onAdvanceFloor).toHaveBeenCalledOnce();
});

test('writes one node and one floor summary for an AI boss settlement', async () => {
  await initializeDatabase();
  const session = (await getChats())[0];
  const state = buildDemoState();
  const run = {
    ...state.run,
    id: 'run-boss-summary',
    floor: 2,
    contentMode: 'ai-director' as const,
    aiBinding: { ...state.run.aiBinding, chatId: session.id },
  };
  await saveChat({ ...session, purpose: 'game-run', runId: run.id });
  const encounter: PendingEncounter = {
    kind: 'boss', nodeId: 'boss-exit', resolved: true, choices: [], bossKind: 'gatekeeper',
    phase: 'reconciliation', enemyIntegrity: 0, coreStability: 100, glitch: false,
  };

  render(
    <TavernProvider>
      <NodeSettlement
        encounter={encounter}
        sanity={76}
        overload={28}
        echoes={20}
        fragmentCount={3}
        run={run}
        presentation={{
          version: 1,
          runId: run.id,
          nodeId: encounter.nodeId,
          nodeType: 'boss',
          source: 'ai-director',
          title: '守门残响',
          description: '最后的壁垒已经松开。',
          choiceIds: ['boss-resonate'],
          modifierIds: [],
        }}
      />
    </TavernProvider>,
  );

  await waitFor(async () => {
    const saved = (await getChats()).find((chat) => chat.id === session.id);
    expect(saved?.summaries?.map((summary) => summary.kind)).toEqual(['node', 'floor']);
  });
  expect((await getChats()).find((chat) => chat.id === session.id)?.summaries).toHaveLength(2);
});
