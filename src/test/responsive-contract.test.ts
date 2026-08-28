import responsiveCss from '../styles/responsive.css?raw';
import globalCss from '../styles/global.css?raw';
import tokensCss from '../styles/tokens.css?raw';

test('响应式样式定义四档布局与系统减少动效规则', () => {
  const css = `${responsiveCss}\n${globalCss}`;
  expect(css).toContain('@media (max-width: 1439px)');
  expect(css).toContain('@media (max-width: 1023px)');
  expect(css).toContain('@media (max-width: 767px)');
  expect(css).toContain('@media (max-width: 420px)');
  expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  expect(css).toContain('overflow-wrap: anywhere');
});

test('界面偏好具有 CSS 契约并维持可触控目标', () => {
  const css = `${tokensCss}\n${globalCss}\n${responsiveCss}`;
  expect(css).toContain('[data-motion="reduced"]');
  expect(css).toContain('[data-density="compact"]');
  expect(css).toContain('[data-font-size="large"]');
  expect(css).toContain('[data-contrast="high"]');
  expect(css).toMatch(/min-(?:width|height):\s*(?:40|44|48)px/);
});
