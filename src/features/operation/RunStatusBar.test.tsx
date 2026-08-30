import { render, screen } from '@testing-library/react';
import type { GreatswordCombatState, ProgressionState, RunState } from '../../game/types';
import { CHARACTER_ARTWORK_SRC } from '../../components/CharacterArtwork';
import { RunStatusBar } from './RunStatusBar';

const run: RunState = {
  id: 'run-hud',
  seed: 'HUD-001',
  mode: 'preset',
  phase: 'exploring',
  turn: 4,
  floor: 2,
  maxFloor: 3,
  currentNodeId: 'node-2',
  result: null,
};

const rosmontis: GreatswordCombatState = {
  actionPoints: 3,
  sanity: 76,
  overload: 42,
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

const progression: ProgressionState = { firstClear: false, completedRuns: 0 };

test('renders the replaceable Rosmontis portrait and complete Run telemetry', () => {
  render(<RunStatusBar run={run} rosmontis={rosmontis} progression={progression} />);

  expect(screen.getByRole('img', { name: '迷迭香人物立绘占位图' })).toHaveAttribute('src', CHARACTER_ARTWORK_SRC);
  expect(screen.getByText('预设迷宫')).toBeVisible();
  expect(screen.getByText('第 2 层')).toBeVisible();
  expect(screen.getByText('回合 4')).toBeVisible();
  expect(screen.getByText('行动点 3')).toBeVisible();
  expect(screen.getByText('尚未完成首次逃离')).toBeVisible();

  expect(screen.getByRole('meter', { name: '思维稳定性' })).toHaveAttribute('aria-valuenow', '76');
  expect(screen.getByRole('meter', { name: '精神过载度' })).toHaveAttribute('aria-valuenow', '42');
});

test.each([
  [70, '过载警戒 · 边缘信号干扰'],
  [85, '神经警告 · 认知撕裂风险'],
  [100, '链路中断 · 立即终止潜入'],
])('shows the explicit overload warning at %i%%', (overload, warning) => {
  render(
    <RunStatusBar
      run={run}
      rosmontis={{ ...rosmontis, overload }}
      progression={progression}
    />,
  );

  expect(screen.getByText(warning)).toBeVisible();
});
