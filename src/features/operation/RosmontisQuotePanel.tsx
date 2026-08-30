import { useEffect } from 'react';
import { CharacterArtwork } from '../../components/CharacterArtwork';
import { parseTemporaryQuote } from '../../llm/gameContent';
import {
  GameContentRequestError,
  requestStructuredGameContent,
} from '../../llm/gameContentClient';
import { buildQuotePrompt } from '../../llm/gamePrompts';
import { describeRuleEvent, selectLocalQuote } from '../../llm/localQuotes';
import type { ApiSettings } from '../../sillytavern';
import { useGameStore } from '../../store/gameStore';
import { OpenAiTavernTransport } from '../tavern/runtime/openai-tavern-transport';
import type { TavernTransport } from '../tavern/runtime/tavern-transport';
import { useTavern } from '../tavern/runtime/useTavern';

interface RosmontisQuotePanelProps {
  apiOverride?: ApiSettings | null;
  transportOverride?: TavernTransport;
}

interface ActiveQuoteRequest {
  controller: AbortController;
  consumers: number;
}

const defaultTransport = new OpenAiTavernTransport();
const activeRequests = new Map<string, ActiveQuoteRequest>();

export function RosmontisQuotePanel({ apiOverride, transportOverride }: RosmontisQuotePanelProps) {
  const runtime = useTavern();
  const run = useGameStore((state) => state.run);
  const ruleLog = useGameStore((state) => state.ruleLog);
  const rosmontis = useGameStore((state) => state.rosmontis);
  const eventTitle = useGameStore((state) => state.llmDirector.event?.content.title);
  const quote = useGameStore((state) => state.llmDirector.quote);
  const latestEvent = ruleLog.at(-1);
  const triggerKey = latestEvent ? `${run.id}:quote:${ruleLog.length}:${latestEvent.type}` : null;
  const api = apiOverride === undefined ? runtime.settings?.api ?? null : apiOverride;
  const transport = transportOverride ?? defaultTransport;

  useEffect(() => {
    if (!latestEvent || !triggerKey) return;
    const initial = useGameStore.getState();
    if (initial.llmDirector.handledTriggers.includes(triggerKey)) return;

    if (!api?.apiKey.trim()) {
      const token = initial.beginDirectorRequest('quote', triggerKey);
      initial.markDirectorTriggerHandled(triggerKey);
      initial.acceptDirectorQuote(
        token,
        triggerKey,
        selectLocalQuote(latestEvent, initial.rosmontis),
        'local-fallback',
      );
      return;
    }

    const existing = activeRequests.get(triggerKey);
    if (existing) {
      existing.consumers += 1;
      return () => releaseRequest(triggerKey, existing);
    }

    const active: ActiveQuoteRequest = { controller: new AbortController(), consumers: 1 };
    activeRequests.set(triggerKey, active);
    const token = initial.beginDirectorRequest('quote', triggerKey);

    void requestStructuredGameContent({
      transport,
      api,
      task: 'quote',
      messages: buildQuotePrompt({
        actionSummary: describeRuleEvent(latestEvent),
        eventTitle,
        sanity: rosmontis.sanity,
        overload: rosmontis.overload,
      }),
      parse: parseTemporaryQuote,
      signal: active.controller.signal,
    }).then((content) => {
      const latest = useGameStore.getState();
      if (latest.run.id !== run.id) return;
      latest.markDirectorTriggerHandled(triggerKey);
      latest.acceptDirectorQuote(token, triggerKey, content, 'remote');
    }).catch((error: unknown) => {
      if (isAborted(error, active.controller.signal)) return;
      const latest = useGameStore.getState();
      if (latest.run.id !== run.id) return;
      latest.markDirectorTriggerHandled(triggerKey);
      latest.acceptDirectorQuote(
        token,
        triggerKey,
        selectLocalQuote(latestEvent, latest.rosmontis),
        'local-fallback',
      );
    }).finally(() => {
      if (activeRequests.get(triggerKey) === active) activeRequests.delete(triggerKey);
    });

    return () => releaseRequest(triggerKey, active);
  }, [api, eventTitle, latestEvent, rosmontis.overload, rosmontis.sanity, run.id, transport, triggerKey]);

  if (!triggerKey || quote?.triggerKey !== triggerKey) return null;
  const sourceLabel = quote.source === 'remote'
    ? '远程生成'
    : api?.apiKey.trim() ? '本地回退' : '本地预设';

  return (
    <section
      id="rosmontis-temporary-quote"
      className="rosmontis-quote-panel"
      role="status"
      aria-label="迷迭香临时台词"
      aria-live="polite"
      aria-atomic="true"
    >
      <CharacterArtwork
        kind="portrait"
        label="迷迭香人物立绘占位图"
        className="rosmontis-quote-portrait"
      />
      <div>
        <header>
          <span>ROSMONTIS / TEMPORARY VOICE</span>
          <strong>{sourceLabel}</strong>
        </header>
        <p className="rosmontis-quote-typewriter" key={triggerKey}>{quote.content.text}</p>
      </div>
    </section>
  );
}

function releaseRequest(triggerKey: string, active: ActiveQuoteRequest) {
  active.consumers -= 1;
  window.setTimeout(() => {
    if (active.consumers > 0 || activeRequests.get(triggerKey) !== active) return;
    active.controller.abort();
    activeRequests.delete(triggerKey);
  }, 0);
}

function isAborted(error: unknown, signal: AbortSignal) {
  return signal.aborted || (error instanceof GameContentRequestError && error.code === 'aborted');
}
