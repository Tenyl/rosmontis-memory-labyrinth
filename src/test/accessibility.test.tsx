import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from './renderApp';

const routes = [
  ['/operation', 'operation-page-title', '作战主控台'],
  ['/memory', 'memory-page-title', '意识战场'],
  ['/operators', 'operators-page-title', '迷迭香状态'],
  ['/archive', 'archive-page-title', '记忆图鉴'],
  ['/log', 'log-page-title', '行动记录'],
  ['/settings', 'settings-page-title', '系统设置'],
] as const;

test.each(routes)('%s 具有清晰的页面地标与控件名称', async (path, titleId, title) => {
  const { container } = renderApp(path);
  const heading = await screen.findByRole('heading', { level: 1, name: title }, { timeout: 8_000 });

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
  await screen.findByRole('heading', { level: 1, name: '作战主控台' }, { timeout: 8_000 });

  expect(screen.getByRole('link', { name: '跳至主内容' })).toHaveAttribute('href', '#main-content');
  expect(screen.getByRole('navigation', { name: '主要功能' })).toBeInTheDocument();
  expect(container.querySelector('#nav-operation-open')).toHaveAttribute('aria-current', 'page');
});

test('全局壳与设置页均展示非营利二创免责声明', async () => {
  const copy = '本项目为基于《明日方舟》世界观的非营利性同人衍生作品，角色及设定版权归上海鹰角网络科技有限公司所有。';
  const { container } = renderApp('/settings');
  await screen.findByRole('heading', { level: 1, name: '系统设置' }, { timeout: 8_000 });

  expect(container.querySelector('#global-fanwork-disclaimer')).toHaveTextContent(copy);
  expect(container.querySelector('#settings-fanwork-disclaimer')).toHaveTextContent(copy);
  expect(screen.getAllByText(copy, { exact: true })).toHaveLength(2);
});

test('酒馆编排四个公开工作区的交互控件有名称、字段有标签且不使用结构性表情符号', async () => {
  const user = userEvent.setup();
  renderApp('/operation');
  await user.click(await screen.findByRole('button', { name: /打开酒馆编排/ }));
  const dialog = await screen.findByRole('dialog', { name: '酒馆编排中枢' });

  for (const tabName of [/^会话 /, /^变量 /, /^世界书 /, /^预设 /]) {
    await user.click(within(dialog).getByRole('tab', { name: tabName }));
    const controls = [...dialog.querySelectorAll<HTMLElement>('button, a[href], input, textarea, select')];
    controls.forEach((control) => expect(control).toHaveAccessibleName());
    const fields = [...dialog.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select')];
    fields.forEach((field) => {
      expect(field.labels?.length || field.getAttribute('aria-label') || field.getAttribute('aria-labelledby')).toBeTruthy();
    });
  }

  expect(dialog.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
});
