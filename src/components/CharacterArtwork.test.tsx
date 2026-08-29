import { render, screen } from '@testing-library/react';
import { CharacterArtwork, CHARACTER_ARTWORK_SRC } from './CharacterArtwork';

test('人物资源槽始终使用项目内空白图片', () => {
  render(<CharacterArtwork kind="portrait" label="迷迭香立绘" />);

  const image = screen.getByRole('img', { name: '迷迭香立绘' });
  expect(image).toHaveAttribute('src', CHARACTER_ARTWORK_SRC);
  expect(image).toHaveAttribute('data-artwork-kind', 'portrait');
});

test('装饰性人物资源不暴露重复的辅助文本', () => {
  const { container } = render(
    <CharacterArtwork kind="avatar" label="角色头像" decorative />,
  );

  const image = container.querySelector('img');
  expect(image).toHaveAttribute('src', CHARACTER_ARTWORK_SRC);
  expect(image).toHaveAttribute('alt', '');
  expect(image).toHaveAttribute('aria-hidden', 'true');
});
