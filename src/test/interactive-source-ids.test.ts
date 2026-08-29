import { describe, expect, it } from 'vitest';

const sourceModules = import.meta.glob(
  ['../app/**/*.tsx', '../components/**/*.tsx', '../features/**/*.tsx'],
  { eager: true, import: 'default', query: '?raw' },
) as Record<string, string>;

const interactiveTagWithoutId = /<(button|input|select|textarea|summary|a)\b(?:(?!\bid=)[\s\S])*?>/g;

describe('交互元素源码 ID 契约', () => {
  it('所有原生交互元素都声明描述性 ID', () => {
    const missing = Object.entries(sourceModules).flatMap(([file, source]) =>
      [...source.matchAll(interactiveTagWithoutId)].map((match) => ({
        file,
        tag: match[1],
        excerpt: match[0].replace(/\s+/g, ' ').slice(0, 120),
      })),
    );

    expect(missing).toEqual([]);
  });
});
