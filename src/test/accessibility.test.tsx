import { screen } from '@testing-library/react';
import { renderApp } from './renderApp';

const routes = [
  ['/operation', 'operation-page-title', '作战主控台'],
  ['/memory', 'memory-page-title', '意识战场'],
  ['/operators', 'operators-page-title', '干员与小队'],
  ['/archive', 'archive-page-title', '情报档案库'],
  ['/log', 'log-page-title', '行动记录'],
  ['/settings', 'settings-page-title', '系统设置'],
] as const;

test.each(routes)('%s 具有清晰的页面地标与控件名称', async (path, titleId, title) => {
  const { container } = renderApp(path);
  const heading = await screen.findByRole('heading', { level: 1, name: title });

  expect(heading).toHaveAttribute('id', titleId);
  expect(container.querySelectorAll('main')).toHaveLength(1);
  expect(container.querySelector('main#main-content')).toBeInTheDocument();
  expect(container.querySelector('.route-page')).toHaveAttribute('aria-labelledby', titleId);

  const controls = [...container.querySelectorAll<HTMLElement>(
    'button, a[href], input, textarea, select',
  )];
  controls.forEach((control) => expect(control).toHaveAccessibleName());
});

test('提供键盘跳转入口和可感知的全局导航状态', async () => {
  const { container } = renderApp('/operation');
  await screen.findByRole('heading', { level: 1, name: '作战主控台' });

  expect(screen.getByRole('link', { name: '跳至主内容' })).toHaveAttribute('href', '#main-content');
  expect(screen.getByRole('navigation', { name: '主要功能' })).toBeInTheDocument();
  expect(container.querySelector('#nav-operation-open')).toHaveAttribute('aria-current', 'page');
});

