import { screen } from '@testing-library/react';
import { renderApp } from '../test/renderApp';

test.each([
  ['/operation', '作战主控台'],
  ['/memory', '意识战场'],
  ['/operators', '干员与小队'],
  ['/archive', '情报档案库'],
  ['/log', '行动记录'],
  ['/settings', '系统设置'],
])('renders %s with active navigation', async (path, heading) => {
  renderApp(path);

  expect(await screen.findByRole('heading', { name: heading })).toBeVisible();
  expect(screen.getByRole('link', { name: new RegExp(heading) })).toHaveAttribute(
    'aria-current',
    'page',
  );
});
