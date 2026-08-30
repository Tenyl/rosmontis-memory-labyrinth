import { describe, expect, it, vi } from 'vitest';
import { OpenAiTavernTransport } from './openai-tavern-transport';

function sseResponse(parts: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

describe('OpenAiTavernTransport', () => {
  it('parses OpenAI-compatible SSE deltas across network chunks', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => sseResponse([
      'data: {"choices":[{"delta":{"content":"<main"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"text>雨声</maintext>"}}]}\n\n',
      'data: [DONE]\n\n',
    ]));
    const transport = new OpenAiTavernTransport(fetchImpl);
    const chunks: string[] = [];

    for await (const chunk of transport.stream({
      messages: [{ role: 'user', content: '前进' }],
      api: { baseUrl: 'https://llm.example/v1/', apiKey: 'sk-private', model: 'story-model', timeout: 1000 },
      gameTask: 'event',
    }, new AbortController().signal)) chunks.push(chunk);

    expect(chunks).toEqual(['<main', 'text>雨声</maintext>']);
    expect(fetchImpl).toHaveBeenCalledWith('https://llm.example/v1/chat/completions', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer sk-private' }),
    }));
    const request = fetchImpl.mock.calls[0]?.[1];
    const body = JSON.parse(String(request?.body)) as Record<string, unknown>;
    expect(body).not.toHaveProperty('gameTask');
    expect(body).not.toHaveProperty('offlineContext');
  });

  it('does not expose an API key in HTTP errors', async () => {
    const transport = new OpenAiTavernTransport(async () => new Response('contains sk-private', { status: 401 }));

    await expect(async () => {
      for await (const _chunk of transport.stream({
        messages: [],
        api: { baseUrl: 'https://llm.example/v1', apiKey: 'sk-private', model: 'story-model', timeout: 1000 },
      }, new AbortController().signal)) {
        // Consume the stream to surface transport errors.
      }
    }).rejects.toThrow('远程模型请求失败（HTTP 401）');
  });
});
