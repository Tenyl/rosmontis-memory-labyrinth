import { describe, expect, test } from 'vitest';
import { FRAGMENT_EFFECTS } from './fragmentCatalog';
import { GREATSWORD_CONFIG } from './greatswords';
import { NODE_CATALOG } from './nodeCatalog';

describe('游戏专有名词契约', () => {
  test('四柄巨剑只使用一个固定名称', () => {
    expect(Object.values(GREATSWORD_CONFIG).map((sword) => sword.name)).toEqual([
      '破壁',
      '守望',
      '认知',
      '共鸣',
    ]);
  });

  test('节点和碎片类别不使用斜杠并列别名', () => {
    expect(Object.values(NODE_CATALOG).map((node) => node.label)).toEqual([
      '常规作战',
      '紧急作战',
      '安全屋',
      '认知黑市',
      '奇境',
      '命运抉择',
      '未知',
      '领袖之敌',
    ]);
    expect(Object.values(FRAGMENT_EFFECTS).map((fragment) => fragment.label)).toEqual([
      '情感碎片',
      '痛苦碎片',
      '技能碎片',
    ]);
  });
});
