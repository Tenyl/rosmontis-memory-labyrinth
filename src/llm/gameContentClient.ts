import type { TavernTransport } from '../features/tavern/runtime/tavern-transport';
import type { ApiSettings } from '../sillytavern';
import type { GamePromptMessage } from './gamePrompts';

export type GameContentTask = 'event' | 'quote' | 'novel';
export type GameContentRequestErrorCode = 'configuration' | 'transport' | 'invalid-response' | 'aborted';

const safeMessages: Record<GameContentRequestErrorCode, string> = {
  configuration: '远程模型配置不完整。',
  transport: '远程模型请求失败，请稍后重试。',
  'invalid-response': '远程模型返回了无法使用的结构化内容。',
  aborted: '远程模型请求已取消。',
};

export class GameContentRequestError extends Error {
  readonly code: GameContentRequestErrorCode;

  constructor(code: GameContentRequestErrorCode) {
    super(safeMessages[code]);
    this.name = 'GameContentRequestError';
    this.code = code;
  }
}

interface StructuredGameContentRequest<T> {
  transport: TavernTransport;
  api: ApiSettings;
  task: GameContentTask;
  messages: readonly GamePromptMessage[];
  parse: (value: unknown) => T;
  signal: AbortSignal;
}

export async function requestStructuredGameContent<T>({
  transport,
  api,
  task,
  messages,
  parse,
  signal,
}: StructuredGameContentRequest<T>): Promise<T> {
  if (signal.aborted) throw new GameContentRequestError('aborted');
  if (!api.baseUrl.trim() || !api.apiKey.trim() || !api.model.trim()) {
    throw new GameContentRequestError('configuration');
  }

  const chunks: string[] = [];
  try {
    for await (const chunk of transport.stream({
      task: 'story',
      gameTask: task,
      messages: messages.map((message) => ({ ...message })),
      api,
      model: api.model,
      stream: true,
    }, signal)) {
      chunks.push(chunk);
    }
  } catch (error) {
    if (signal.aborted || isAbortError(error)) throw new GameContentRequestError('aborted');
    throw new GameContentRequestError('transport');
  }

  if (signal.aborted) throw new GameContentRequestError('aborted');
  try {
    const json = extractJson(chunks.join(''));
    return parse(JSON.parse(json));
  } catch (error) {
    if (error instanceof GameContentRequestError) throw error;
    throw new GameContentRequestError('invalid-response');
  }
}

function extractJson(response: string): string {
  const trimmed = response.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const json = (fenced?.[1] ?? trimmed).trim();
  if (!json.startsWith('{') || !json.endsWith('}')) {
    throw new GameContentRequestError('invalid-response');
  }
  return json;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}
