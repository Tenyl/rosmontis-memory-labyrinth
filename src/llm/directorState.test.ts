import { describe, expect, test } from 'vitest';
import {
  acceptForRun,
  beginDirectorRequest,
  createLlmDirectorState,
  markDirectorTriggerHandled,
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
      content: { text: '我听见雨声了。' },
    };
    const accepted = acceptForRun(state, 'run-a', 'event', token, (current) => ({ ...current, quote: content }));
    const staleRun = acceptForRun(state, 'run-b', 'event', token, (current) => ({ ...current, quote: content }));
    const staleToken = acceptForRun(state, 'run-a', 'event', 'run-a:event:other', (current) => ({ ...current, quote: content }));

    expect(accepted.quote).toBe(content);
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

  test('stores node presentations by Run and node key', async () => {
    const { acceptNodePresentation, getNodePresentation } = await import('./directorState');
    const initial = createLlmDirectorState('run-a');
    const presentation = {
      version: 1 as const, runId: 'run-a', nodeId: 'node-a', nodeType: 'safehouse' as const,
      source: 'local' as const, title: '休息处', description: '短暂稳定神经链路。',
      choiceIds: ['rest-stabilize'], modifierIds: [], quote: '我想休息一下。',
    };
    const next = acceptNodePresentation(initial, presentation);

    expect(getNodePresentation(next, 'run-a', 'node-a')).toEqual(presentation);
    expect(getNodePresentation(next, 'run-b', 'node-a')).toBeNull();
    expect(initial.presentations).toEqual({});
  });
});
