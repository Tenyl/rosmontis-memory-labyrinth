import { describe, expect, test } from 'vitest';
import {
  acceptForRun,
  beginDirectorRequest,
  createLlmDirectorState,
  markDirectorTriggerHandled,
  resolveIntentEffect,
} from './directorState';

describe('LLM director pure state', () => {
  test('creates independent request slots bound to the current Run', () => {
    const initial = createLlmDirectorState('run-a');
    const { state, token } = beginDirectorRequest(initial, 'event', 'node-a');

    expect(token).toBe('run-a:event:node-a');
    expect(state.requests.event).toEqual({ status: 'loading', token, errorCode: null });
    expect(state.requests.quote.status).toBe('idle');
    expect(initial.requests.event.status).toBe('idle');
  });

  test('accepts only the matching request token for the current Run', () => {
    const { state, token } = beginDirectorRequest(createLlmDirectorState('run-a'), 'event', 'node-a');
    const content = {
      triggerKey: 'node-a',
      source: 'remote' as const,
      content: { title: '雨幕', situation: '雨声倒流。', choices: [] },
      resolvedChoiceId: null,
    };
    const accepted = acceptForRun(state, 'run-a', 'event', token, (current) => ({ ...current, event: content }));
    const staleRun = acceptForRun(state, 'run-b', 'event', token, (current) => ({ ...current, event: content }));
    const staleToken = acceptForRun(state, 'run-a', 'event', 'run-a:event:other', (current) => ({ ...current, event: content }));

    expect(accepted.event).toBe(content);
    expect(accepted.requests.event).toMatchObject({ status: 'ready', token: null });
    expect(staleRun).toBe(state);
    expect(staleToken).toBe(state);
  });

  test('deduplicates handled trigger keys without mutating state', () => {
    const initial = createLlmDirectorState('run-a');
    const once = markDirectorTriggerHandled(initial, 'event:node-a');
    const twice = markDirectorTriggerHandled(once, 'event:node-a');

    expect(once.handledTriggers).toEqual(['event:node-a']);
    expect(twice).toBe(once);
    expect(initial.handledTriggers).toEqual([]);
  });

  test.each([
    ['guard', { sanityDelta: 1, overloadDelta: 5 }],
    ['scan', { sanityDelta: -1, overloadDelta: 7 }],
    ['press-on', { sanityDelta: -3, overloadDelta: 10 }],
    ['recover', { sanityDelta: 8, overloadDelta: -12 }],
    ['resonate', { sanityDelta: -4, overloadDelta: 15 }],
  ] as const)('maps %s to a fixed local settlement', (intent, expected) => {
    expect(resolveIntentEffect(intent, { sanity: 60, overload: 30 })).toEqual(expected);
  });
});
