import { describe, expect, test } from 'vitest';
import type { ApiSettings } from '../sillytavern';
import type { TavernTransport } from '../features/tavern/runtime/tavern-transport';
import { parseTemporaryQuote } from './gameContent';
import {
  GameContentRequestError,
  requestStructuredGameContent,
} from './gameContentClient';

const api: ApiSettings = {
  baseUrl: 'https://llm.example/v1',
  apiKey: 'sk-never-expose-this',
  model: 'story-model',
  timeout: 1000,
};
const messages = [
  { role: 'system' as const, content: '只输出 JSON。' },
  { role: 'user' as const, content: '生成一句台词。' },
];

function transportFrom(chunks: string[]): TavernTransport {
  return {
    mode: 'remote',
    async *stream() {
      for (const chunk of chunks) yield chunk;
    },
  };
}

describe('structured LLM game content client', () => {
  test('assembles multi-chunk JSON and validates it once after stream completion', async () => {
    let parseCalls = 0;
    const result = await requestStructuredGameContent({
      transport: transportFrom(['{"text":"我会', '继续。"}']),
      api,
      task: 'quote',
      messages,
      signal: new AbortController().signal,
      parse(value) {
        parseCalls += 1;
        return parseTemporaryQuote(value);
      },
    });

    expect(result).toEqual({ text: '我会继续。' });
    expect(parseCalls).toBe(1);
  });

  test('uses the bound preset transport parameters without changing API settings', async () => {
    let captured: Parameters<TavernTransport['stream']>[0] | null = null;
    const transport: TavernTransport = {
      mode: 'remote',
      async *stream(request) {
        captured = request;
        yield '{"text":"我在这里。"}';
      },
    };

    await requestStructuredGameContent({
      transport, api, task: 'quote', messages, signal: new AbortController().signal,
      model: 'bound-preset-model', temperature: 0.23, maxTokens: 456,
      parse: parseTemporaryQuote,
    });

    expect(captured).toMatchObject({ model: 'bound-preset-model', temperature: 0.23, maxTokens: 456 });
    expect(api.model).toBe('story-model');
  });

  test('accepts a bound preset model when the global model field is empty', async () => {
    await expect(requestStructuredGameContent({
      transport: transportFrom(['{"text":"我会回应。"}']),
      api: { ...api, model: '' },
      task: 'quote', messages, signal: new AbortController().signal,
      model: 'bound-model', parse: parseTemporaryQuote,
    })).resolves.toEqual({ text: '我会回应。' });
  });

  test('extracts one JSON object from an optional Markdown fence', async () => {
    await expect(requestStructuredGameContent({
      transport: transportFrom(['```json\n{"text":"我记得。"}\n```']),
      api,
      task: 'quote',
      messages,
      signal: new AbortController().signal,
      parse: parseTemporaryQuote,
    })).resolves.toEqual({ text: '我记得。' });
  });

  test('rejects prose, trailing content, and parser contract failures as invalid-response', async () => {
    for (const chunks of [
      ['这是回答，不是 JSON。'],
      ['{"text":"我记得。"} trailing'],
      ['{"text":"不是第一人称。"}'],
    ]) {
      await expect(requestStructuredGameContent({
        transport: transportFrom(chunks),
        api,
        task: 'quote',
        messages,
        signal: new AbortController().signal,
        parse: parseTemporaryQuote,
      })).rejects.toMatchObject({ code: 'invalid-response' });
    }
  });

  test('maps transport failures to a secret-free error', async () => {
    const transport: TavernTransport = {
      mode: 'remote',
      async *stream() {
        throw new Error(`upstream rejected ${api.apiKey}`);
      },
    };

    const promise = requestStructuredGameContent({
      transport,
      api,
      task: 'event',
      messages,
      signal: new AbortController().signal,
      parse: parseTemporaryQuote,
    });

    await expect(promise).rejects.toMatchObject({ code: 'transport' });
    await expect(promise).rejects.not.toThrow(api.apiKey);
  });

  test('reports missing configuration and aborts with stable codes', async () => {
    await expect(requestStructuredGameContent({
      transport: transportFrom([]),
      api: { ...api, apiKey: '' },
      task: 'novel',
      messages,
      signal: new AbortController().signal,
      parse: parseTemporaryQuote,
    })).rejects.toMatchObject({ code: 'configuration' });

    const controller = new AbortController();
    controller.abort();
    await expect(requestStructuredGameContent({
      transport: transportFrom([]),
      api,
      task: 'quote',
      messages,
      signal: controller.signal,
      parse: parseTemporaryQuote,
    })).rejects.toMatchObject({ code: 'aborted' });
  });

  test('aborts a hanging transport when the configured timeout expires', async () => {
    const transport: TavernTransport = {
      mode: 'remote',
      async *stream(_request, signal) {
        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
        });
      },
    };

    await expect(requestStructuredGameContent({
      transport,
      api: { ...api, timeout: 5 },
      task: 'diary',
      messages,
      signal: new AbortController().signal,
      parse: parseTemporaryQuote,
    })).rejects.toMatchObject({ code: 'timeout' });
  });

  test('exports a typed error with only safe public context', () => {
    const error = new GameContentRequestError('transport');
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('transport');
    expect(error.message).not.toContain(api.apiKey);
  });
});
