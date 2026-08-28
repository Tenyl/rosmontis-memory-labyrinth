import { screen } from '@testing-library/react';
import { renderApp } from './renderApp';

const routes = [
  ['/operation', '作战主控台'],
  ['/memory', '意识战场'],
  ['/operators', '干员与小队'],
  ['/archive', '情报档案库'],
  ['/log', '行动记录'],
  ['/settings', '系统设置'],
] as const;

test.each(routes)('%s 为每个交互元素提供唯一描述性 ID', async (path, title) => {
  const { container } = renderApp(path);
  await screen.findByRole('heading', { level: 1, name: title });

  const controls = [...container.querySelectorAll<HTMLElement>(
    'button, a[href], input, textarea, select, [role="tab"]',
  )];
  const ids = controls.map((element) => element.id);
  const missing = controls
    .filter((element) => !element.id)
    .map((element) => element.outerHTML.slice(0, 180));

  expect(missing).toEqual([]);
  expect(new Set(ids).size).toBe(ids.length);
  expect(ids.every((id) => /^[a-z][a-z0-9-]+$/.test(id))).toBe(true);
});
