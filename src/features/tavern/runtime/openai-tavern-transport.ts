import { abortError, type TavernTransport, type TavernTransportRequest } from './tavern-transport';

export class OpenAiTavernTransport implements TavernTransport {
  readonly mode = 'remote' as const;

  constructor(private readonly fetchImpl: typeof fetch = globalThis.fetch) {}

  async *stream(request: TavernTransportRequest, signal: AbortSignal): AsyncIterable<string> {
    const api = request.api;
    if (!api?.baseUrl.trim() || !api.apiKey.trim() || !api.model.trim()) {
      throw new Error('远程模型配置不完整，请检查 URL、API Key 与模型');
    }

    const controller = new AbortController();
    const onAbort = () => controller.abort(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    const timeoutId = globalThis.setTimeout(() => controller.abort('timeout'), Math.max(1000, api.timeout));

    try {
      const response = await this.fetchImpl(`${api.baseUrl.trim().replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream, application/json',
          Authorization: `Bearer ${api.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model || api.model,
          messages: request.messages,
          stream: request.stream ?? true,
          ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
          ...(request.maxTokens === undefined ? {} : { max_tokens: request.maxTokens }),
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`远程模型请求失败（HTTP ${response.status}）`);

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
        const content = payload.choices?.[0]?.message?.content;
        if (content) yield content;
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('远程模型没有返回可读取的数据流');
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() ?? '';

        for (const block of blocks) {
          const delta = parseSseBlock(block);
          if (delta === null) return;
          if (delta) yield delta;
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        const delta = parseSseBlock(buffer);
        if (delta) yield delta;
      }
    } catch (error) {
      if (controller.signal.aborted) {
        if (signal.aborted) throw abortError();
        throw new Error('远程模型请求超时，请重试或调整超时时间');
      }
      throw error;
    } finally {
      globalThis.clearTimeout(timeoutId);
      signal.removeEventListener('abort', onAbort);
    }
  }
}

function parseSseBlock(block: string): string | null {
  for (const line of block.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    const data = line.slice(5).trim();
    if (data === '[DONE]') return null;
    if (!data) continue;
    try {
      const payload = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
      const content = payload.choices?.[0]?.delta?.content;
      if (content) return content;
    } catch {
      continue;
    }
  }
  return '';
}
