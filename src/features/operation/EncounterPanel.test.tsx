import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MemoryInventory, PendingEncounter } from '../../game/types';
import { EncounterPanel } from './EncounterPanel';

const inventory: MemoryInventory = {
  capacity: 3,
  fragments: [{ id: 'fragment-rain', name: '雨幕回声', kind: 'skill', tags: ['感知'] }],
  coreFragments: [],
  pendingFragment: null,
};

test('renders combat progress and emits the selected local rule action', async () => {
  const encounter: PendingEncounter = {
    kind: 'combat', nodeId: 'combat-1', resolved: false, round: 2, maxRounds: 3,
    enemyIntegrity: 50, rewardEchoes: 8,
    choices: [
      { id: 'combat-breach', label: '破壁强攻', description: '削减敌方结构。' },
      { id: 'combat-guard', label: '守望推进', description: '建立防护。' },
    ],
  };

  render(
    <EncounterPanel
      encounter={encounter}
      inventory={inventory}
      echoes={12}
      modules={[]}
      resonanceActive={false}
      onResolve={vi.fn()}
      onAction={vi.fn()}
      onSellFragment={vi.fn()}
      onAdvanceFloor={vi.fn()}
      canAdvanceFloor={false}
    />,
  );

  expect(screen.getByRole('heading', { name: '残响实体压制' })).toBeVisible();
  expect(screen.getByText('结构完整度 50 / 80')).toBeVisible();
  expect(screen.getByText('第 2 / 3 轮')).toBeVisible();
  expect(screen.queryByRole('button', { name: /破壁强攻/ })).not.toBeInTheDocument();
  expect(document.querySelector('#btn-encounter-combat-breach')).toBeNull();
  expect(screen.getByText(/点击上方.*破壁.*守望/)).toBeVisible();
});

test('renders shop module offers, affordability and fragment sales', async () => {
  const user = userEvent.setup();
  const onResolve = vi.fn();
  const onSellFragment = vi.fn();
  const encounter: PendingEncounter = {
    kind: 'shop', nodeId: 'shop-1', resolved: false,
    choices: [{ id: 'leave-shop', label: '离开认知黑市', description: '结束交易。' }],
    offers: [
      { id: 'offer-breach', kind: 'module', moduleId: 'breach-circuit', price: 10 },
      { id: 'offer-noise', kind: 'module', moduleId: 'white-noise', price: 14 },
    ],
  };

  render(
    <EncounterPanel
      encounter={encounter}
      inventory={inventory}
      echoes={12}
      modules={[]}
      resonanceActive={false}
      onResolve={onResolve}
      onAction={vi.fn()}
      onSellFragment={onSellFragment}
      onAdvanceFloor={vi.fn()}
      canAdvanceFloor={false}
    />,
  );

  expect(screen.getByRole('heading', { name: '认知补给终端' })).toBeVisible();
  expect(screen.getByRole('button', { name: /购买破壁回路.*10/ })).toBeEnabled();
  expect(screen.getByRole('button', { name: /购买白噪声协议.*14/ })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: /购买破壁回路.*10/ }));
  expect(onResolve).toHaveBeenCalledWith('buy:offer-breach');
  await user.click(screen.getByRole('button', { name: /出售雨幕回声/ }));
  expect(onSellFragment).toHaveBeenCalledWith('fragment-rain');
});

test('keeps unavailable wonder choices visible with an explicit requirement', () => {
  const encounter: PendingEncounter = {
    kind: 'encounter', nodeId: 'wonder-1', resolved: false,
    choices: [
      { id: 'wonder-observe', label: '观察异常', description: '回收残响。' },
      { id: 'wonder-resonate', label: '激活共鸣层', description: '稳定场景。', requiresResonance: true },
    ],
  };

  render(
    <EncounterPanel
      encounter={encounter}
      inventory={inventory}
      echoes={0}
      modules={[]}
      resonanceActive={false}
      onResolve={vi.fn()}
      onAction={vi.fn()}
      onSellFragment={vi.fn()}
      onAdvanceFloor={vi.fn()}
      canAdvanceFloor={false}
    />,
  );

  expect(screen.getByRole('button', { name: /激活共鸣层.*需要预备共鸣/ })).toBeDisabled();
});

test('reveals an unknown result only after local settlement', () => {
  const unresolved: PendingEncounter = {
    kind: 'unknown', nodeId: 'unknown-1', resolved: false, hiddenType: 'combat',
    glitch: true, directEntryBonus: 2,
    choices: [{ id: 'unknown-enter', label: '进入未知信号', description: '揭示结果。' }],
  };
  const { rerender } = render(
    <EncounterPanel
      encounter={unresolved}
      inventory={inventory}
      echoes={0}
      modules={[]}
      resonanceActive={false}
      onResolve={vi.fn()}
      onAction={vi.fn()}
      onSellFragment={vi.fn()}
      onAdvanceFloor={vi.fn()}
      canAdvanceFloor={false}
    />,
  );

  expect(screen.queryByText(/真实类型/)).not.toBeInTheDocument();
  rerender(
    <EncounterPanel
      encounter={{ ...unresolved, resolved: true }}
      inventory={inventory}
      echoes={0}
      modules={[]}
      resonanceActive={false}
      onResolve={vi.fn()}
      onAction={vi.fn()}
      onSellFragment={vi.fn()}
      onAdvanceFloor={vi.fn()}
      canAdvanceFloor={false}
    />,
  );
  expect(screen.getByText('真实类型：常规作战')).toBeVisible();
});

test('accepts a dragged tactical card as the same encounter action', () => {
  const onAction = vi.fn();
  const encounter: PendingEncounter = {
    kind: 'combat', nodeId: 'combat-drop', resolved: false, round: 1, maxRounds: 3,
    enemyIntegrity: 80, rewardEchoes: 8, choices: [],
  };
  render(<EncounterPanel encounter={encounter} inventory={inventory} echoes={0} modules={[]} resonanceActive={false} onResolve={vi.fn()} onAction={onAction} onSellFragment={vi.fn()} onAdvanceFloor={vi.fn()} canAdvanceFloor={false} />);
  const panel = screen.getByRole('heading', { name: '残响实体压制' }).closest('section')!;
  fireEvent.drop(panel, { dataTransfer: { getData: () => 'breach', types: ['application/x-rosmontis-sword'] } });
  expect(onAction).toHaveBeenCalledWith({ type: 'play-sword', swordId: 'breach' });
});

test('shows boss phase progress and the next-floor action after settlement', async () => {
  const user = userEvent.setup();
  const onAdvanceFloor = vi.fn();
  const encounter: PendingEncounter = {
    kind: 'boss', bossKind: 'closed-heart', nodeId: 'boss-1', resolved: true, phase: 'reconciliation',
    enemyIntegrity: 0, coreStability: 100, glitch: false,
    choices: [],
  };

  render(
    <EncounterPanel
      encounter={encounter}
      inventory={inventory}
      echoes={0}
      modules={[]}
      resonanceActive={false}
      onResolve={vi.fn()}
      onAction={vi.fn()}
      onSellFragment={vi.fn()}
      onAdvanceFloor={onAdvanceFloor}
      canAdvanceFloor
    />,
  );

  expect(screen.getByText('共鸣度 100 / 100')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '进入下一层记忆迷宫' }));
  expect(onAdvanceFloor).toHaveBeenCalledOnce();
});
