import { render, screen, within } from '@testing-library/react';
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

test('renders four configured tactical cards with AP, cooldown, and overload costs', () => {
  render(
    <GreatswordActions
      rosmontis={rosmontis}
      currentNodeType="combat"
      ruleLog={[]}
      onUse={vi.fn()}
    />,
  );

  const breach = screen.getByRole('button', { name: /破壁.*普通攻击/ });
  const watch = screen.getByRole('button', { name: /守望.*巨剑护盾/ });
  const perception = screen.getByRole('button', { name: /感知.*战术感知/ });
  const resonance = screen.getByRole('button', { name: /共鸣.*精神爆发/ });

  expect(breach).toHaveAttribute('id', 'btn-greatsword-breach');
  expect(watch).toHaveAttribute('id', 'btn-greatsword-watch');
  expect(perception).toHaveAttribute('id', 'btn-greatsword-perception');
  expect(resonance).toHaveAttribute('id', 'btn-greatsword-resonance');
  expect(within(breach).getByText('2 AP')).toBeVisible();
  expect(within(breach).getByText('冷却 2')).toBeVisible();
  expect(within(breach).getByText('过载 +12%')).toBeVisible();
  expect(within(watch).getByText('1 AP')).toBeVisible();
});

test('disables node-incompatible and cooling swords while dispatching a legal configured action', async () => {
  const user = userEvent.setup();
  const onUse = vi.fn();
  render(
    <GreatswordActions
      rosmontis={{
        ...rosmontis,
        greatswords: { ...rosmontis.greatswords, watch: { cooldown: 1 } },
      }}
      currentNodeType="encounter"
      ruleLog={[]}
      onUse={onUse}
    />,
  );

  expect(screen.getByRole('button', { name: /破壁.*普通攻击/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /守望.*巨剑护盾/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /共鸣.*精神爆发/ })).toBeDisabled();
  const perception = screen.getByRole('button', { name: /感知.*战术感知/ });
  expect(perception).toBeEnabled();

  await user.click(perception);
  expect(onUse).toHaveBeenCalledOnce();
  expect(onUse).toHaveBeenCalledWith({
    swordId: 'perception',
    target: 'maze',
    nodeType: 'encounter',
  });
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
      ruleLog={ruleLog}
      onUse={vi.fn()}
    />,
  );

  expect(screen.getByRole('status')).toHaveTextContent('感知已执行 · -1 AP · +7% 过载 · 冷却 2');
});
