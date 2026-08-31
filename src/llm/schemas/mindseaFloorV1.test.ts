import { describe, expect, test } from 'vitest';
import type { AuthoritativeNovelNode } from '../gameContent';
import { parseMindseaFloorV1 } from './mindseaFloorV1';

const nodes: AuthoritativeNovelNode[] = [
  { id: 'mindsea-start', type: 'safehouse' },
  { id: 'mindsea-exit', type: 'boss' },
];

const valid = {
  title: '荒原极光',
  theme: '记忆在极光下变得温柔',
  premise: '我和博士沿着没有尽头的光继续前进。',
  endingHook: '远处又亮起一盏等候我们的灯。',
  nodeBriefs: [
    { nodeId: 'mindsea-start', nodeType: 'safehouse', title: '静默营地', description: '我在这里重新听见风声。' },
    { nodeId: 'mindsea-exit', nodeType: 'boss', title: '极光尽头', description: '我决定不再把过去当作敌人。' },
  ],
};

describe('mindsea floor V1 schema', () => {
  test('accepts an exact authoritative node list', () => {
    expect(parseMindseaFloorV1(valid, nodes)).toEqual(valid);
  });

  test('rejects topology changes, hidden fields, and numeric rule fields', () => {
    expect(() => parseMindseaFloorV1({ ...valid, nodeBriefs: valid.nodeBriefs.slice(0, 1) }, nodes)).toThrow();
    expect(() => parseMindseaFloorV1({ ...valid, hiddenType: 'combat' }, nodes)).toThrow();
    expect(() => parseMindseaFloorV1({ ...valid, reward: 100 }, nodes)).toThrow();
  });
});
