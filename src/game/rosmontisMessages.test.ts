import { describe, expect, it } from 'vitest';
import { getRosmontisMessage } from './rosmontisMessages';

describe('Rosmontis first-person feedback', () => {
  it('covers normal, warning, berserk and low-stability states', () => {
    expect(getRosmontisMessage({ kind: 'status', sanity: 100, overload: 20 })).toContain('博士');
    expect(getRosmontisMessage({ kind: 'status', sanity: 80, overload: 74 })).toContain('摇晃');
    expect(getRosmontisMessage({ kind: 'status', sanity: 80, overload: 85 })).toContain('好痛');
    expect(getRosmontisMessage({ kind: 'status', sanity: 25, overload: 40 })).toContain('握紧');
  });

  it('personifies gameplay blockers without hiding technical configuration errors', () => {
    expect(getRosmontisMessage({ kind: 'movement-blocked', sanity: 80, overload: 20 })).toBe('博士……眼前的残响还没消散，我的剑还没收回来……等我一下，好吗？');
    expect(getRosmontisMessage({ kind: 'fragment-overflow', sanity: 80, overload: 20 })).toContain('你会帮我记住');
    expect(getRosmontisMessage({ kind: 'invalid-boss-action', sanity: 70, overload: 50, bossPhase: 'reconciliation' })).toContain('不要再攻击');
  });
});
