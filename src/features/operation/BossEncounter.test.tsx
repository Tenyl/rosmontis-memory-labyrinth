import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import type { PendingEncounter } from '../../game/types';
import { BossEncounter } from './BossEncounter';

test('shows the closed-heart reconciliation and exposes only resonance guidance and comfort', async () => {
  const user = userEvent.setup();
  const onAction = vi.fn();
  const encounter: Extract<PendingEncounter, { kind: 'boss' }> = {
    kind: 'boss', bossKind: 'closed-heart', nodeId: 'floor-5-boss', resolved: false,
    phase: 'reconciliation', enemyIntegrity: 0, coreStability: 50, glitch: false, choices: [],
  };
  render(<BossEncounter encounter={encounter} onAction={onAction} />);

  expect(screen.getByRole('heading', { name: '阶段二：拥抱与共鸣' })).toBeVisible();
  expect(screen.getByText('共鸣度 50 / 100')).toBeVisible();
  await user.click(screen.getByRole('button', { name: /握住手/ }));
  expect(onAction).toHaveBeenCalledWith({ type: 'comfort', gesture: 'hold-hand' });
  expect(document.querySelector('#btn-encounter-boss-breach')).toBeNull();
});
