import { render, screen } from '@testing-library/react';
import type { GreatswordCombatState, ProgressionState, RunState } from '../../game/types';
import { resolveImageAsset } from '../../assets/assetRegistry';
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
  render(
    <RunStatusBar
      run={run}
      rosmontis={rosmontis}
      progression={progression}
      echoes={18}
      scoutPoints={2}
      moduleCount={3}
    />,
  );

  expect(screen.getByRole('img', { name: '迷迭香人物立绘占位图' })).toHaveAttribute('src', resolveImageAsset('rosmontisPortrait'));
  expect(screen.getByText('预设迷宫')).toBeVisible();
  expect(screen.getByText('第 2 / 3 层')).toBeVisible();
  expect(screen.getByText('回合 4')).toBeVisible();
  expect(screen.getByText('行动点 3')).toBeVisible();
  expect(screen.getByText('残响 18')).toBeVisible();
  expect(screen.getByText('侦测 2')).toBeVisible();
  expect(screen.getByText('模块 3')).toBeVisible();
  expect(screen.getByText('声音资源待填充')).toBeVisible();
  expect(screen.getByText('尚未完成首次逃离')).toBeVisible();

  expect(screen.getByRole('meter', { name: '思维稳定性' })).toHaveAttribute('aria-valuenow', '76');
  expect(screen.getByRole('meter', { name: '精神过载度' })).toHaveAttribute('aria-valuenow', '42');
});

test.each([
  [70, '博士，周围开始摇晃了……'],
  [85, '好痛……但我还听得到你。'],
  [100, '博士……声音断掉了……不要离开我。'],
])('shows the explicit overload warning at %i%%', (overload, warning) => {
  render(
    <RunStatusBar
      run={run}
      rosmontis={{ ...rosmontis, overload }}
      progression={progression}
      echoes={0}
      scoutPoints={0}
      moduleCount={0}
    />,
  );

  expect(screen.getByText(warning)).toBeVisible();
});
