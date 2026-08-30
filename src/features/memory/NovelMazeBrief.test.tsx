import { render, screen } from '@testing-library/react';
import type { DirectorNovelRecord } from '../../llm/directorState';
import { NovelMazeBrief } from './NovelMazeBrief';

const novel: DirectorNovelRecord = {
  triggerKey: 'run-1:novel-blueprint',
  source: 'remote',
  content: {
    title: '无声列车的终点',
    theme: '一列拒绝抵达清晨的记忆列车',
    premise: '迷迭香必须沿车厢找回被剪碎的站名。',
    endingHook: '最后一扇门后，传来属于下一层的报站声。',
    nodeBriefs: [],
  },
};

test('renders nothing outside novel mode', () => {
  const { container } = render(<NovelMazeBrief mode="preset" novel={novel} />);
  expect(container).toBeEmptyDOMElement();
});

test('renders novel provenance, theme, premise, and ending hook', () => {
  render(<NovelMazeBrief mode="novel" novel={novel} />);
  const region = screen.getByRole('region', { name: '小说迷宫简报' });
  expect(region).toHaveTextContent('无声列车的终点');
  expect(region).toHaveTextContent('远程生成');
  expect(region).toHaveTextContent('一列拒绝抵达清晨的记忆列车');
  expect(region).toHaveTextContent('最后一扇门后');
});
