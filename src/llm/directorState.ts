import type {
  DirectorIntent,
  IndependentEventContent,
  NovelBlueprintContent,
  TemporaryQuoteContent,
} from './gameContent';
import type { GameContentRequestErrorCode, GameContentTask } from './gameContentClient';

export type DirectorContentSource = 'remote' | 'local-fallback';
export type DirectorRequestStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface DirectorRequestSlot {
  status: DirectorRequestStatus;
  token: string | null;
  errorCode: GameContentRequestErrorCode | null;
}

export interface DirectorEventRecord {
  triggerKey: string;
  source: DirectorContentSource;
  content: IndependentEventContent;
  resolvedChoiceId: string | null;
}

export interface DirectorQuoteRecord {
  triggerKey: string;
  source: DirectorContentSource;
  content: TemporaryQuoteContent;
}

export interface DirectorNovelRecord {
  triggerKey: string;
  source: DirectorContentSource;
  content: NovelBlueprintContent;
}

export interface LlmDirectorState {
  runId: string;
  requests: Record<GameContentTask, DirectorRequestSlot>;
  handledTriggers: string[];
  event: DirectorEventRecord | null;
  quote: DirectorQuoteRecord | null;
  novel: DirectorNovelRecord | null;
}

const idleRequest = (): DirectorRequestSlot => ({ status: 'idle', token: null, errorCode: null });

export function createLlmDirectorState(runId: string): LlmDirectorState {
  return {
    runId,
    requests: { event: idleRequest(), quote: idleRequest(), novel: idleRequest() },
    handledTriggers: [],
    event: null,
    quote: null,
    novel: null,
  };
}

export function beginDirectorRequest(
  state: LlmDirectorState,
  kind: GameContentTask,
  triggerKey: string,
): { state: LlmDirectorState; token: string } {
  const token = `${state.runId}:${kind}:${triggerKey}`;
  return {
    token,
    state: {
      ...state,
      requests: {
        ...state.requests,
        [kind]: { status: 'loading', token, errorCode: null },
      },
    },
  };
}

export function acceptForRun(
  state: LlmDirectorState,
  currentRunId: string,
  kind: GameContentTask,
  token: string,
  apply: (state: LlmDirectorState) => LlmDirectorState,
): LlmDirectorState {
  if (state.runId !== currentRunId || state.requests[kind].token !== token) return state;
  const next = apply(state);
  return {
    ...next,
    requests: {
      ...next.requests,
      [kind]: { status: 'ready', token: null, errorCode: null },
    },
  };
}

export function failDirectorRequest(
  state: LlmDirectorState,
  currentRunId: string,
  kind: GameContentTask,
  token: string,
  errorCode: GameContentRequestErrorCode,
): LlmDirectorState {
  if (state.runId !== currentRunId || state.requests[kind].token !== token) return state;
  return {
    ...state,
    requests: {
      ...state.requests,
      [kind]: { status: 'error', token: null, errorCode },
    },
  };
}

export function markDirectorTriggerHandled(state: LlmDirectorState, triggerKey: string): LlmDirectorState {
  if (state.handledTriggers.includes(triggerKey)) return state;
  return { ...state, handledTriggers: [...state.handledTriggers, triggerKey] };
}

export function resolveIntentEffect(
  intent: DirectorIntent,
  _vitals: { sanity: number; overload: number },
): { sanityDelta: number; overloadDelta: number } {
  const effects: Record<DirectorIntent, { sanityDelta: number; overloadDelta: number }> = {
    guard: { sanityDelta: 1, overloadDelta: 5 },
    scan: { sanityDelta: -1, overloadDelta: 7 },
    'press-on': { sanityDelta: -3, overloadDelta: 10 },
    recover: { sanityDelta: 8, overloadDelta: -12 },
    resonate: { sanityDelta: -4, overloadDelta: 15 },
  };
  return { ...effects[intent] };
}

export function restoreLlmDirectorState(value: unknown, currentRunId: string): LlmDirectorState {
  const initial = createLlmDirectorState(currentRunId);
  if (!isRecord(value) || value.runId !== currentRunId) return initial;
  const handledTriggers = Array.isArray(value.handledTriggers)
    ? [...new Set(value.handledTriggers.filter((item): item is string => typeof item === 'string'))]
    : [];
  return {
    ...initial,
    handledTriggers,
    event: isRecord(value.event) ? value.event as unknown as DirectorEventRecord : null,
    quote: isRecord(value.quote) ? value.quote as unknown as DirectorQuoteRecord : null,
    novel: isRecord(value.novel) ? value.novel as unknown as DirectorNovelRecord : null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
