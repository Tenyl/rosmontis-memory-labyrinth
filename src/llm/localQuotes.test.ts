import { describe, expect, test } from 'vitest';
import type { RuleEvent } from '../game/types';
import { describeRuleEvent, selectLocalQuote } from './localQuotes';

const events: RuleEvent[] = [
  { type: 'check.resolved', attribute: '感知', roll: 14, total: 17, difficulty: 12, outcome: 'success' },
  { type: 'greatsword.used', swordId: 'breach', actionPointCost: 1, overloadDelta: 10, cooldown: 2 },
  { type: 'fragment.acquired', fragmentId: 'fragment-1', kind: 'standard' },
  { type: 'fragment.overflow', fragmentId: 'fragment-2' },
  { type: 'fragment.discarded', fragmentId: 'fragment-2' },
  { type: 'fragment.replaced', forgottenFragmentId: 'fragment-1', acquiredFragmentId: 'fragment-2' },
  { type: 'run.moved', sourceNodeId: 'node-1', targetNodeId: 'node-2' },
  { type: 'node.completed', nodeId: 'node-2' },
  { type: 'run.ended', result: 'victory' },
];

describe('local Rosmontis quotes', () => {
  test('describes tactical actions without exposing raw identifiers as instructions', () => {
    expect(describeRuleEvent(events[1])).toContain('破壁巨剑');
    expect(describeRuleEvent(events[6])).toContain('移动');
  });

  test('is deterministic for the same event and overload band', () => {
    expect(selectLocalQuote(events[1], { sanity: 81, overload: 25 })).toEqual(
      selectLocalQuote(events[1], { sanity: 81, overload: 25 }),
    );
  });

  test.each([20, 76, 91])('keeps every local line first-person and within 30 characters at overload %i', (overload) => {
    for (const event of events) {
      const quote = selectLocalQuote(event, { sanity: 70, overload });
      expect(quote.text).toContain('我');
      expect(Array.from(quote.text).length).toBeLessThanOrEqual(30);
    }
  });
});
