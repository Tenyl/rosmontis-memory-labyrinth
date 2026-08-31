import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ProgressionState, RunState } from '../../game/types';
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
};

const freshProgression: ProgressionState = { firstClear: false, completedRuns: 0 };

function renderLifecycle({
  run = exploringRun,
  progression = freshProgression,
  llmEnabled = false,
  currentNodeIsCore = false,
  coreStability = 0,
} = {}) {
  const onStart = vi.fn();
  const onReset = vi.fn();
  const onStabilize = vi.fn();
  const onContinueMindsea = vi.fn();
  render(
    <RunLifecycleDialog
      run={run}
      progression={progression}
      llmEnabled={llmEnabled}
      currentNodeIsCore={currentNodeIsCore}
      coreStability={coreStability}
      onStart={onStart}
      onReset={onReset}
      onStabilize={onStabilize}
      onContinueMindsea={onContinueMindsea}
    />,
  );
  return { onStart, onReset, onStabilize, onContinueMindsea };
}

test('keeps preset available while explaining locked endless and novel modes', () => {
  renderLifecycle();

  expect(screen.getByRole('radio', { name: /^预设迷宫/ })).toBeEnabled();
  expect(screen.getByRole('radio', { name: /^本地无尽/ })).toBeDisabled();
  expect(screen.getByRole('radio', { name: /^小说剧情/ })).toBeDisabled();
  expect(screen.getByText('完成一次预设迷宫后解锁本地无尽。')).toBeVisible();
  expect(screen.getByText('首次通关并接入 LLM 后解锁小说剧情。')).toBeVisible();
  expect(document.querySelector('#run-seed-input')).toBeInTheDocument();
});

test('unlocks local endless after first clear and novel only when LLM is connected', () => {
  const { unmount } = render(
    <RunLifecycleDialog
      run={exploringRun}
      progression={{ firstClear: true, completedRuns: 1 }}
      llmEnabled={false}
      currentNodeIsCore={false}
      coreStability={0}
      onStart={vi.fn()}
      onReset={vi.fn()}
      onStabilize={vi.fn()}
    />,
  );
  expect(screen.getByRole('radio', { name: /^本地无尽/ })).toBeEnabled();
  expect(screen.getByRole('radio', { name: /^小说剧情/ })).toBeDisabled();
  expect(screen.getByText('小说剧情需要已保存的 LLM 接口配置。')).toBeVisible();

  unmount();
  renderLifecycle({ progression: { firstClear: true, completedRuns: 1 }, llmEnabled: true });
  expect(screen.getByRole('radio', { name: /^小说剧情/ })).toBeEnabled();
});

test('starts the selected mode with the explicit seed', async () => {
  const user = userEvent.setup();
  const { onStart } = renderLifecycle({ progression: { firstClear: true, completedRuns: 1 } });

  const seedInput = screen.getByRole('textbox', { name: /迷宫种子/ });
  await user.clear(seedInput);
  await user.type(seedInput, 'LOCAL-ENDLESS-9');
  await user.click(screen.getByRole('radio', { name: /^本地无尽/ }));
  await user.click(screen.getByRole('button', { name: '开始新的记忆潜入' }));

  expect(onStart).toHaveBeenCalledWith('LOCAL-ENDLESS-9', 'endless', false);
});

test('offers the normal core stabilization action only at 100 stability', async () => {
  const user = userEvent.setup();
  const { onStabilize } = renderLifecycle({ currentNodeIsCore: true, coreStability: 100 });

  await user.click(screen.getByRole('button', { name: '稳定记忆核心并尝试逃离' }));
  expect(onStabilize).toHaveBeenCalledOnce();
});

test.each([
  ['victory' as const, '潜入完成：记忆迷宫已逃离'],
  ['defeat' as const, '潜入失败：认知链路中断'],
])('shows a terminal %s summary and restarts the preset Run', async (phase, title) => {
  const user = userEvent.setup();
  const { onReset } = renderLifecycle({
    run: { ...exploringRun, phase, result: phase },
    progression: phase === 'victory' ? { firstClear: true, completedRuns: 1 } : freshProgression,
  });

  expect(screen.getByRole('dialog', { name: title })).toBeVisible();
  if (phase === 'victory') expect(screen.getByText('本地无尽模式已解锁。')).toBeVisible();
  await user.click(screen.getByRole('button', { name: '重新开始预设迷宫' }));
  expect(onReset).toHaveBeenCalledOnce();
});

test('offers the boundless mindsea only after victory with an LLM connection', async () => {
  const user = userEvent.setup();
  const { onContinueMindsea } = renderLifecycle({
    run: { ...exploringRun, floor: 5, maxFloor: 5, phase: 'victory', result: 'victory' },
    progression: { firstClear: true, completedRuns: 1 },
    llmEnabled: true,
  });
  await user.click(screen.getByRole('button', { name: '进入无垠心海' }));
  expect(onContinueMindsea).toHaveBeenCalledOnce();
});
