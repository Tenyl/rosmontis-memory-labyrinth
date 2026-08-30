import { render, screen } from '@testing-library/react';
import { ModuleInventory } from './ModuleInventory';

test('renders empty state and installed module details with replaceable artwork', () => {
  const { rerender } = render(<ModuleInventory modules={[]} />);
  expect(screen.getByText('尚未装载认知模块')).toBeVisible();

  rerender(<ModuleInventory modules={['breach-circuit', 'white-noise']} />);
  expect(screen.getByText('破壁回路')).toBeVisible();
  expect(screen.getByText('白噪声协议')).toBeVisible();
  expect(screen.getAllByRole('img', { name: '认知模块资源占位图' })).toHaveLength(2);
});
