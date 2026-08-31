import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FragmentOverflowDialog } from './FragmentOverflowDialog';

const inventory = {
  capacity: 1,
  fragments: [{ id: 'warm-afternoon', name: '温室里的午后', kind: 'emotion' as const, tags: ['温存'] }],
  coreFragments: [{ id: 'core-name', name: '仍被呼唤的名字', kind: 'core' as const, tags: ['核心'] }],
  pendingFragment: { id: 'cold-lab', name: '冰冷实验编号', kind: 'pain' as const, tags: ['实验室'] },
};

test('uses Rosmontis first-person overflow copy and exposes all three unique choices', async () => {
  const user = userEvent.setup();
  const onResolve = vi.fn();
  render(<FragmentOverflowDialog inventory={inventory} onResolve={onResolve} />);

  expect(screen.getByText(/博士……我的脑子好胀/)).toBeVisible();
  expect(screen.getByRole('img', { name: '记忆碎片资源占位图' })).toBeVisible();
  expect(screen.getByRole('button', { name: /直接遗忘“温室里的午后”/ })).toHaveAttribute('id', 'btn-fragment-replace-warm-afternoon');
  const transcribe = screen.getByRole('button', { name: /抄录“温室里的午后”至手记簿/ });
  expect(transcribe).toHaveAttribute('id', 'btn-fragment-transcribe-warm-afternoon');
  expect(screen.getByRole('button', { name: /放弃新碎片/ })).toHaveAttribute('id', 'btn-fragment-discard-pending');

  await user.click(transcribe);
  expect(onResolve).toHaveBeenCalledWith({ type: 'transcribe-and-replace', fragmentId: 'warm-afternoon' });
  expect(screen.getByText(/核心保护/)).toBeVisible();
});
