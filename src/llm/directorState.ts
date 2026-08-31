import type {
  DirectorIntent,
  IndependentEventContent,
  NovelBlueprintContent,
  TemporaryQuoteContent,
} from './gameContent';
import type { GameContentRequestErrorCode, GameContentTask } from './gameContentClient';
import type { NodePresentation } from './schemas/gameDirectorV1';

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
  presentations: Record<string, NodePresentation>;
}

const idleRequest = (): DirectorRequestSlot => ({ status: 'idle', token: null, errorCode: null });

export function createLlmDirectorState(runId: string): LlmDirectorState {
  return {
    runId,
    requests: { event: idleRequest(), quote: idleRequest(), novel: idleRequest(), diary: idleRequest(), mindsea: idleRequest(), 'tactical-command': idleRequest() },
    handledTriggers: [],
    event: null,
    quote: null,
    novel: null,
    presentations: {},
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

export function completeDirectorRequest(
  state: LlmDirectorState,
  currentRunId: string,
  kind: GameContentTask,
  token: string,
): LlmDirectorState {
  return acceptForRun(state, currentRunId, kind, token, (director) => director);
}

export function markDirectorTriggerHandled(state: LlmDirectorState, triggerKey: string): LlmDirectorState {
  if (state.handledTriggers.includes(triggerKey)) return state;
  return { ...state, handledTriggers: [...state.handledTriggers, triggerKey] };
}

export function acceptNodePresentation(
  state: LlmDirectorState,
  presentation: NodePresentation,
): LlmDirectorState {
  if (state.runId !== presentation.runId) return state;
  return {
    ...state,
    presentations: {
      ...state.presentations,
      [presentationKey(presentation.runId, presentation.nodeId)]: presentation,
    },
  };
}

export function getNodePresentation(
  state: LlmDirectorState,
  runId: string,
  nodeId: string,
): NodePresentation | null {
  if (state.runId !== runId) return null;
  return state.presentations[presentationKey(runId, nodeId)] ?? null;
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
    presentations: normalizePresentations(value.presentations, currentRunId),
  };
}

function presentationKey(runId: string, nodeId: string) {
  return `${runId}:${nodeId}`;
}

function normalizePresentations(value: unknown, runId: string): Record<string, NodePresentation> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([, presentation]) => (
    isRecord(presentation)
    && presentation.version === 1
    && presentation.runId === runId
    && typeof presentation.nodeId === 'string'
  ))) as Record<string, NodePresentation>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
