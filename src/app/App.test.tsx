import { render, screen } from '@testing-library/react';
import { App } from './App';

test('renders the game brand and skip link', async () => {
  render(<App />);

  expect(screen.getByRole('link', { name: '跳至主内容' })).toHaveAttribute('href', '#main-content');
  expect(await screen.findByRole('link', { name: '迷迭香的记忆迷宫' })).toBeVisible();
});
