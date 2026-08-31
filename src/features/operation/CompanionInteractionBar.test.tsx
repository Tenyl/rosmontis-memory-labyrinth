import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { CompanionInteractionBar } from './CompanionInteractionBar';

const rosmontis = {
  actionPoints: 4, sanity: 70, overload: 85, guard: 0, insight: 0, enemyIntegrity: 100, coreStability: 0,
  greatswords: { breach: { cooldown: 0 }, watch: { cooldown: 0 }, perception: { cooldown: 0 }, resonance: { cooldown: 0 } },
};

test('offers persistent comfort actions with costs and first-person feedback', async () => {
  const user = userEvent.setup();
  const onAction = vi.fn();
  render(<CompanionInteractionBar rosmontis={rosmontis} bossPhase={null} onAction={onAction} />);
  expect(screen.getByRole('button', { name: /轻触额头.*1 AP/ })).toHaveAttribute('id', 'btn-companion-touch-forehead');
  expect(screen.getByRole('button', { name: /握住手.*2 AP/ })).toHaveAttribute('id', 'btn-companion-hold-hand');
  expect(screen.getByRole('status')).toHaveTextContent('好痛');
  await user.click(screen.getByRole('button', { name: /握住手.*2 AP/ }));
  expect(onAction).toHaveBeenCalledWith({ type: 'comfort', gesture: 'hold-hand' });
  expect(screen.getByRole('status')).toHaveTextContent('别松开');
  expect(document.querySelector('audio')).toBeNull();
});
