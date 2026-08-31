import { expect, test } from 'vitest';
import { parseDiaryV1 } from './diaryV1';

test('accepts first-person diary prose and rejects rule authority', () => {
  expect(parseDiaryV1({ title: '雨停之后', body: '我还记得博士握住我的手。' })).toEqual({ title: '雨停之后', body: '我还记得博士握住我的手。' });
  expect(() => parseDiaryV1({ title: '越权', body: '我胜利了。', reward: 100 })).toThrow(/数值|规则/);
  expect(() => parseDiaryV1({ title: '越权', body: '我胜利了。', commentary: '额外字段' })).toThrow(/字段/);
});
