import { describe, expect, it } from 'vitest';
import { LocalTavernTransport } from './local-tavern-transport';

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
});
