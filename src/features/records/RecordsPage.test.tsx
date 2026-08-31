import { act, screen } from '@testing-library/react';
import { useGameStore } from '../../store/gameStore';
import { renderApp } from '../../test/renderApp';

test('records expose Run history and formatted current rules only', async () => {
  renderApp('/records');
  act(() => useGameStore.setState({
    runHistory: [{
      id: 'run-history-1',
      runId: 'run-history-1',
      seed: 'HISTORY-SEED',
      mode: 'preset',
      result: 'victory',
      floor: 1,
      turns: 8,
      completedNodes: 7,
      fragmentsRecovered: 3,
      finalSanity: 76,
      finalOverload: 42,
      recordedAt: '03:40:00',
    }],
    ruleLog: [{
      type: 'run.moved',
      sourceNodeId: 'node-entry',
      targetNodeId: 'node-combat',
    }],
  }));

  expect(await screen.findByRole('region', { name: 'Run 历史' })).toHaveTextContent('HISTORY-SEED');
  expect(screen.getByRole('region', { name: '当前局记录' })).toHaveTextContent('进入新的迷宫节点');
  expect(screen.queryByRole('tab', { name: '战术时间线' })).not.toBeInTheDocument();
});
