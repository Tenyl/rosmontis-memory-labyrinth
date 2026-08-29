import responsiveCss from '../styles/responsive.css?raw';
import globalCss from '../styles/global.css?raw';
import tokensCss from '../styles/tokens.css?raw';
import componentsCss from '../components/components.css?raw';

test('响应式样式定义四档布局与系统减少动效规则', () => {
  const css = `${responsiveCss}\n${globalCss}`;
  expect(css).toContain('@media (max-width: 1439px)');
  expect(css).toContain('@media (max-width: 1023px)');
  expect(css).toContain('@media (max-width: 767px)');
  expect(css).toContain('@media (max-width: 420px)');
  expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  expect(css).toContain('overflow-wrap: anywhere');
  expect(css).toContain('[data-motion="reduced"] .route-page');
  expect(css).toContain('animation: none !important');
});

test('界面偏好具有 CSS 契约并维持可触控目标', () => {
  const css = `${tokensCss}\n${globalCss}\n${responsiveCss}`;
  expect(css).toContain('[data-motion="reduced"]');
  expect(css).toContain('[data-density="compact"]');
  expect(css).toContain('[data-font-size="large"]');
  expect(css).toContain('[data-contrast="high"]');
  expect(css).toMatch(/min-(?:width|height):\s*(?:40|44|48)px/);
  expect(responsiveCss).toMatch(/@media \(max-width: 767px\)[\s\S]*button,[\s\S]*a\[href\][\s\S]*min-height:\s*44px/);
});

test('任意换行仅用于机器标识、URL 与用户生成令牌', () => {
  expect(globalCss).not.toMatch(/p,\s*\n?li,[\s\S]{0,100}overflow-wrap:\s*anywhere/);
  expect(globalCss).toContain('.break-token');
  expect(globalCss).toContain('overflow-wrap: anywhere');
});

test('跨路由按钮系统由共享组件样式提供', () => {
  expect(componentsCss).toContain('.terminal-button {');
  expect(componentsCss).toContain('.terminal-button.is-primary');
  expect(componentsCss).toContain('.terminal-button.is-secondary');
});

test('屏幕阅读器辅助文本由全局样式隐藏', () => {
  expect(globalCss).toContain('.sr-only {');
  expect(globalCss).toContain('clip-path: inset(50%)');
});

test('滚动区域使用统一的细轨道视觉', () => {
  expect(globalCss).toContain('::-webkit-scrollbar');
  expect(globalCss).toContain('scrollbar-width: thin');
});
