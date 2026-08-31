import { act, screen } from '@testing-library/react';
import { useGameStore } from '../../store/gameStore';
import { renderApp } from '../../test/renderApp';

test('memory collection contains only permanent memories', async () => {
  renderApp('/compendium');
  act(() => useGameStore.setState({
    memoryCompendium: [{
      id: 'fragment-compendium-1',
      name: '雨幕中的病历页',
      kind: 'emotion',
      tags: ['病区', '雨声'],
      discoveredRunId: 'run-compendium',
      discoveries: 2,
    }],
  }));

  expect(await screen.findByRole('heading', { name: '记忆图鉴' })).toBeVisible();
  expect(screen.getByText('雨幕中的病历页')).toBeVisible();
  expect(screen.queryByRole('tab', { name: '叙事档案' })).not.toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: '关系图' })).not.toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: '推理台' })).not.toBeInTheDocument();
});
