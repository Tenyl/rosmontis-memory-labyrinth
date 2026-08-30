import { useEffect } from 'react';
import { createSeededRandom, nextRandom } from '../../game/random';
import { selectPresetEvent } from '../../game/presetEvents';
import type { MazeNode, RunState } from '../../game/types';
import type { IndependentEventContent } from '../../llm/gameContent';
import { parseIndependentEvent } from '../../llm/gameContent';
import {
  GameContentRequestError,
  requestStructuredGameContent,
} from '../../llm/gameContentClient';
import { buildEventPrompt } from '../../llm/gamePrompts';
import type { ApiSettings } from '../../sillytavern';
import { useGameStore } from '../../store/gameStore';
import { OpenAiTavernTransport } from '../tavern/runtime/openai-tavern-transport';
import type { TavernTransport } from '../tavern/runtime/tavern-transport';
import { useTavern } from '../tavern/runtime/useTavern';

interface LlmEventDirectorProps {
  apiOverride?: ApiSettings | null;
  transportOverride?: TavernTransport;
}

interface ActiveEventRequest {
  controller: AbortController;
  consumers: number;
}

const defaultTransport = new OpenAiTavernTransport();
const activeRequests = new Map<string, ActiveEventRequest>();
const fallbackIntents = ['scan', 'guard', 'press-on'] as const;

export function shouldTriggerLlmEvent(run: RunState, node: MazeNode): boolean {
  if (run.phase !== 'exploring' || node.type !== 'blank-event') return false;
  if (run.mode === 'novel') return true;
  const [draw] = nextRandom(createSeededRandom(`${run.seed}:${node.id}:llm-event`));
  return draw < 0.5;
}

export function LlmEventDirector({ apiOverride, transportOverride }: LlmEventDirectorProps) {
  const runtime = useTavern();
  const run = useGameStore((state) => state.run);
  const node = useGameStore((state) => state.maze.nodes.find((item) => item.id === state.run.currentNodeId));
  const directorEvent = useGameStore((state) => state.llmDirector.event);
  const resolveChoice = useGameStore((state) => state.resolveDirectorChoice);
  const api = apiOverride === undefined ? runtime.settings?.api ?? null : apiOverride;
  const transport = transportOverride ?? defaultTransport;

  useEffect(() => {
    if (!node || !api?.apiKey.trim() || !shouldTriggerLlmEvent(run, node)) return;

    const requestKey = `${run.id}:event:${node.id}`;
    const existing = activeRequests.get(requestKey);
    if (existing) {
      existing.consumers += 1;
      return () => releaseRequest(requestKey, existing);
    }

    const state = useGameStore.getState();
    if (state.llmDirector.handledTriggers.includes(requestKey)) return;

    const active: ActiveEventRequest = { controller: new AbortController(), consumers: 1 };
    activeRequests.set(requestKey, active);
    const token = state.beginDirectorRequest('event', node.id);
    const fragmentNames = [
      ...state.memoryInventory.fragments,
      ...state.memoryInventory.coreFragments,
    ].map((fragment) => fragment.name);

    void requestStructuredGameContent({
      transport,
      api,
      task: 'event',
      messages: buildEventPrompt({
        seed: run.seed,
        floor: run.floor,
        nodeType: node.type,
        sanity: state.rosmontis.sanity,
        overload: state.rosmontis.overload,
        fragmentNames,
      }),
      parse: parseIndependentEvent,
      signal: active.controller.signal,
    }).then((content) => {
      const latest = useGameStore.getState();
      latest.markDirectorTriggerHandled(requestKey);
      latest.acceptDirectorEvent(token, node.id, content, 'remote');
    }).catch((error: unknown) => {
      if (isAborted(error, active.controller.signal)) return;
      const latest = useGameStore.getState();
      const fallback = createFallbackEvent(run, node, latest);
      latest.markDirectorTriggerHandled(requestKey);
      latest.acceptDirectorEvent(token, node.id, fallback, 'local-fallback');
      latest.addNotification({
        id: 'notification-llm-event-fallback',
        kind: 'warning',
        title: 'AI 事件已切换至本地预设',
        message: '远程内容未通过结构校验，本节点仍由确定性离线事件继续运行。',
        dismissible: true,
      });
    }).finally(() => {
      if (activeRequests.get(requestKey) === active) activeRequests.delete(requestKey);
    });

    return () => releaseRequest(requestKey, active);
  }, [api, node, run, transport]);

  if (!node || directorEvent?.triggerKey !== node.id) return null;

  const resolved = directorEvent.resolvedChoiceId !== null;
  return (
    <section
      id="llm-independent-event"
      className="llm-event-director"
      role="region"
      aria-labelledby="llm-independent-event-title"
    >
      <header>
        <div>
          <span>DIRECTOR / INDEPENDENT EVENT</span>
          <h2 id="llm-independent-event-title">AI 独立事件</h2>
        </div>
        <strong>{directorEvent.source === 'remote' ? '远程生成' : '本地回退'}</strong>
      </header>
      <div className="llm-event-copy">
        <h3>{directorEvent.content.title}</h3>
        <p>{directorEvent.content.situation}</p>
      </div>
      <div className="llm-event-choices" aria-label="事件行动选择">
        {directorEvent.content.choices.map((choice) => (
          <button
            id={`llm-event-choice-${choice.id}`}
            key={choice.id}
            type="button"
            aria-label={`选择事件行动：${choice.label}`}
            className={directorEvent.resolvedChoiceId === choice.id ? 'is-selected' : ''}
            disabled={resolved || run.phase !== 'exploring'}
            onClick={() => resolveChoice(choice.id)}
          >
            <span>{choice.label}</span>
            <small>{choice.description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function releaseRequest(requestKey: string, active: ActiveEventRequest) {
  active.consumers -= 1;
  window.setTimeout(() => {
    if (active.consumers > 0 || activeRequests.get(requestKey) !== active) return;
    active.controller.abort();
    activeRequests.delete(requestKey);
  }, 0);
}

function createFallbackEvent(
  run: RunState,
  node: MazeNode,
  state: ReturnType<typeof useGameStore.getState>,
): IndependentEventContent {
  const selected = selectPresetEvent({
    randomState: createSeededRandom(`${run.seed}:${node.id}:llm-event-fallback`),
    nodeType: node.type,
    sanity: state.rosmontis.sanity,
    overload: state.rosmontis.overload,
    fragments: state.memoryInventory.fragments,
  }).event;
  const choices: IndependentEventContent['choices'] = selected.choices.map((choice, index) => ({
    id: choice.id,
    label: choice.label,
    description: choice.description,
    intent: fallbackIntents[index] ?? 'press-on',
  }));
  if (choices.length < 3) {
    choices.push({
      id: 'stabilize-boundary',
      label: '稳定认知边界',
      description: '不直接读取异常内容，先建立可撤回的安全锚点。',
      intent: 'guard',
    });
  }
  return {
    title: selected.title,
    situation: `${selected.body} ${selected.context}`,
    choices,
  };
}

function isAborted(error: unknown, signal: AbortSignal) {
  return signal.aborted || (error instanceof GameContentRequestError && error.code === 'aborted');
}
