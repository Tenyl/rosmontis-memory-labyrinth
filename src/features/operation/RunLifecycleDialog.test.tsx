import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RunState } from '../../game/types';
import { RunLifecycleDialog } from './RunLifecycleDialog';

const exploringRun: RunState = {
  id: 'run-lifecycle',
  seed: 'PRESET-001',
  mode: 'preset',
  phase: 'exploring',
  turn: 7,
  floor: 1,
  maxFloor: 3,
  currentNodeId: 'node-current',
  result: null,
  contentMode: 'local',
  narrativeStyle: 'tactical',
  aiFailurePolicy: 'ask',
  aiBinding: { chatId: null, characterId: null, personaId: null, presetId: null, lorebookIds: [] },
};

function renderLifecycle(run: RunState, llmEnabled = false) {
  const onReset = vi.fn();
  const onContinueMindsea = vi.fn();
  render(
    <RunLifecycleDialog
      run={run}
      llmEnabled={llmEnabled}
      onReset={onReset}
      onContinueMindsea={onContinueMindsea}
    />,
  );
  return { onReset, onContinueMindsea };
}

test.each([
  ['victory' as const, '潜入完成：记忆迷宫已逃离'],
  ['defeat' as const, '潜入失败：认知链路中断'],
])('shows a terminal %s summary and restarts the preset Run', async (phase, title) => {
  const user = userEvent.setup();
  const { onReset } = renderLifecycle({ ...exploringRun, phase, result: phase });

  expect(screen.getByRole('dialog', { name: title })).toBeVisible();
  if (phase === 'victory') expect(screen.getByText('本地无尽模式已解锁。')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '重新开始预设迷宫' }));
  expect(onReset).toHaveBeenCalledOnce();
});

test('offers the boundless mindsea only after victory with an LLM connection', async () => {
  const user = userEvent.setup();
  const { onContinueMindsea } = renderLifecycle(
    { ...exploringRun, floor: 5, maxFloor: 5, phase: 'victory', result: 'victory' },
    true,
  );

  await user.click(screen.getByRole('button', { name: '进入无垠心海' }));
  expect(onContinueMindsea).toHaveBeenCalledOnce();
});
