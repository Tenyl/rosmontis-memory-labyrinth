import { render, screen } from '@testing-library/react';
import { App } from './App';

test('renders the original terminal brand and skip link', () => {
  render(<App />);

  expect(screen.getByRole('link', { name: '跳至主内容' })).toHaveAttribute(
    'href',
    '#main-content',
  );
  expect(screen.getByText('罗德岛意识战术终端')).toBeVisible();
});
