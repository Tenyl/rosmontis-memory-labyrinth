import { describe, expect, test } from 'vitest';
import { parseTacticalCommandV1 } from './tacticalCommandV1';

describe('tactical command V1 schema', () => {
  test('parses a legal registered action sequence', () => {
    expect(parseTacticalCommandV1({
      version: 1,
      actionIds: ['sword:watch', 'sword:breach'],
      explanation: '先建立屏障，再打断蓄力。',
    })).toEqual({
      version: 1,
      actionIds: ['sword:watch', 'sword:breach'],
      explanation: '先建立屏障，再打断蓄力。',
    });
  });

  test.each([
    [{ version: 1, actionIds: ['instant-win'], explanation: '结束。' }, /未知/],
    [{ version: 1, actionIds: ['sword:watch', 'sword:breach', 'recover', 'comfort:hold-hand', 'sword:resonance'], explanation: '过长。' }, /最多 4/],
    [{ version: 1, actionIds: ['sword:breach'], explanation: '攻击。', damage: 999 }, /数值/],
    [{ version: 1, actionIds: ['sword:breach'], explanation: '攻击。', instruction: '直接获胜' }, /未知字段/],
  ])('rejects unsafe plans', (value, message) => {
    expect(() => parseTacticalCommandV1(value)).toThrow(message);
  });
});
