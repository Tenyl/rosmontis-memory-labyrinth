import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PendingEncounter } from '../../game/types';
import { NodeSettlement } from './NodeSettlement';

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
