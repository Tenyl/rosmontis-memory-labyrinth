import type { ApiSettings, Task } from '../../../sillytavern/types';

export interface TavernTransportRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  task?: Task;
  api?: ApiSettings;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface TavernTransport {
  readonly mode: 'local' | 'remote';
  stream(request: TavernTransportRequest, signal: AbortSignal): AsyncIterable<string>;
}

export function abortError(message = '生成已停止'): DOMException {
  return new DOMException(message, 'AbortError');
}
