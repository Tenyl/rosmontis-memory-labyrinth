import { describe, expect, it } from 'vitest';
import { LocalTavernTransport } from './local-tavern-transport';
import { createSeededRandom } from '../../../game/random';

describe('LocalTavernTransport', () => {
  it('emits the same six-tag protocol used by remote generation', async () => {
    const transport = new LocalTavernTransport({ delayMs: 0 });
    const chunks: string[] = [];

    for await (const chunk of transport.stream({ messages: [{ role: 'user', content: '检查雨声' }] }, new AbortController().signal)) {
      chunks.push(chunk);
    }

    const text = chunks.join('');
    expect(text).toContain('<thinking>');
    expect(text).toContain('<maintext>');
    expect(text).toContain('<option>');
    expect(text).toContain('<sum>');
    expect(text).toContain('<vars>');
  });

  it('stops emitting when its AbortSignal is aborted', async () => {
    const controller = new AbortController();
    const transport = new LocalTavernTransport({ delayMs: 10 });
    const iterator = transport.stream({ messages: [] }, controller.signal)[Symbol.asyncIterator]();

    await iterator.next();
    controller.abort();

    await expect(iterator.next()).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('streams a deterministic preset event from the current offline Run context', async () => {
    const transport = new LocalTavernTransport({ delayMs: 0 });
    const request = {
      messages: [{ role: 'user' as const, content: '扫描空白断层' }],
      offlineContext: {
        randomState: createSeededRandom('transport-event'),
        nodeType: 'blank-event' as const,
        sanity: 64,
        overload: 38,
        fragments: [{ id: 'fragment-rain', name: '逆流的雨声', kind: 'standard' as const, tags: ['雨幕'] }],
      },
    };
    const collect = async () => {
      const chunks: string[] = [];
      for await (const chunk of transport.stream(request, new AbortController().signal)) chunks.push(chunk);
      return chunks.join('');
    };

    const first = await collect();
    const replay = await collect();

    expect(replay).toBe(first);
    expect(first).toMatch(/向上坠落的雨|缺失的第十三阶/);
    expect(first).toContain('逆流的雨声');
    expect(first).toContain('<option>');
  });
});
