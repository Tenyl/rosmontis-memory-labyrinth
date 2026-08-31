import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GreatswordCombatState, RuleEvent } from '../../game/types';
import { GreatswordActions } from './GreatswordActions';

const rosmontis: GreatswordCombatState = {
  actionPoints: 4,
  sanity: 100,
  overload: 18,
  guard: 0,
  insight: 0,
  enemyIntegrity: 100,
  coreStability: 0,
  greatswords: {
    breach: { cooldown: 0 },
    watch: { cooldown: 0 },
    perception: { cooldown: 0 },
    resonance: { cooldown: 0 },
  },
};
const explorationCharges = { breach: 1, watch: 1, perception: 1, resonance: 1 } as const;

test('renders four configured tactical cards with AP, cooldown, and overload costs', () => {
  render(
    <GreatswordActions
      rosmontis={rosmontis}
      currentNodeType="combat"
      encounter={null}
      explorationCharges={explorationCharges}
      ruleLog={[]}
      onAction={vi.fn()}
    />,
  );

  const breach = screen.getByRole('button', { name: /立柱.*破壁.*破甲粉碎/ });
  const watch = screen.getByRole('button', { name: /门扉.*守望.*实体屏障/ });
  const perception = screen.getByRole('button', { name: /探针.*认知.*神经扫描/ });
  const resonance = screen.getByRole('button', { name: /哀鸣.*共鸣.*全域共振/ });

  expect(breach).toHaveAttribute('id', 'btn-greatsword-breach');
  expect(watch).toHaveAttribute('id', 'btn-greatsword-watch');
  expect(perception).toHaveAttribute('id', 'btn-greatsword-perception');
  expect(resonance).toHaveAttribute('id', 'btn-greatsword-resonance');
  expect(within(breach).getByText('2 AP')).toBeVisible();
  expect(within(breach).getByText('冷却 2')).toBeVisible();
  expect(within(breach).getByText('过载 +12%')).toBeVisible();
  expect(within(breach).getByText('探索充能 1')).toBeVisible();
  expect(within(watch).getByText('1 AP')).toBeVisible();
  const setData = vi.fn();
  fireEvent.dragStart(breach, { dataTransfer: { setData } });
  expect(setData).toHaveBeenCalledWith('application/x-rosmontis-sword', 'breach');
});

test('disables node-incompatible and cooling swords while dispatching a legal configured action', async () => {
  const user = userEvent.setup();
  const onAction = vi.fn();
  render(
    <GreatswordActions
      rosmontis={{
        ...rosmontis,
        greatswords: { ...rosmontis.greatswords, watch: { cooldown: 1 } },
      }}
      currentNodeType="encounter"
      encounter={null}
      explorationCharges={explorationCharges}
      ruleLog={[]}
      onAction={onAction}
    />,
  );

  expect(screen.getByRole('button', { name: /立柱.*破壁.*破甲粉碎/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /门扉.*守望.*实体屏障/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /哀鸣.*共鸣.*全域共振/ })).toBeEnabled();
  const perception = screen.getByRole('button', { name: /探针.*认知.*神经扫描/ });
  expect(perception).toBeEnabled();

  await user.click(perception);
  expect(onAction).toHaveBeenCalledOnce();
  expect(onAction).toHaveBeenCalledWith({ type: 'play-sword', swordId: 'perception' });
});

test('reports the newest settled sword event without recalculating its values', () => {
  const ruleLog: RuleEvent[] = [
    { type: 'greatsword.used', swordId: 'watch', actionPointCost: 1, overloadDelta: 5, cooldown: 1 },
    { type: 'greatsword.used', swordId: 'perception', actionPointCost: 1, overloadDelta: 7, cooldown: 2 },
  ];

  render(
    <GreatswordActions
      rosmontis={rosmontis}
      currentNodeType="encounter"
      encounter={null}
      explorationCharges={explorationCharges}
      ruleLog={ruleLog}
      onAction={vi.fn()}
    />,
  );

  expect(screen.getByRole('status')).toHaveTextContent('探针 / 认知已执行 · -1 AP · +7% 过载 · 冷却 2');
});

test('disables precision scanning while overload is in the berserk band', () => {
  render(
    <GreatswordActions
      rosmontis={{ ...rosmontis, overload: 80 }}
      currentNodeType="encounter"
      encounter={null}
      explorationCharges={explorationCharges}
      ruleLog={[]}
      onAction={vi.fn()}
    />,
  );

  const perception = screen.getByRole('button', { name: /探针.*认知.*神经扫描/ });
  expect(perception).toBeDisabled();
  expect(perception).toHaveAccessibleDescription('暴走时无法维持精细的神经扫描');
});

test('locks damage cards after the closed heart enters reconciliation', () => {
  render(
    <GreatswordActions
      rosmontis={rosmontis}
      currentNodeType="boss"
      encounter={{
        kind: 'boss', bossKind: 'closed-heart', nodeId: 'boss-five', resolved: false,
        phase: 'reconciliation', enemyIntegrity: 0, coreStability: 40, glitch: false, choices: [],
      }}
      explorationCharges={explorationCharges}
      ruleLog={[]}
      onAction={vi.fn()}
    />,
  );
  const breach = screen.getByRole('button', { name: /立柱.*破壁.*破甲粉碎/ });
  const resonance = screen.getByRole('button', { name: /哀鸣.*共鸣.*全域共振/ });
  expect(breach).toBeDisabled();
  expect(breach).toHaveAccessibleDescription(/仅允许哀鸣.*共鸣与安抚/);
  expect(resonance).toBeEnabled();
});
