import { useEffect } from 'react';
import { CharacterArtwork } from '../../components/CharacterArtwork';
import { parseTemporaryQuote } from '../../llm/gameContent';
import {
  GameContentRequestError,
  requestStructuredGameContent,
} from '../../llm/gameContentClient';
import { describeRuleEvent, selectLocalQuote } from '../../llm/localQuotes';
import { assembleGameDirectorPrompt } from '../../llm/tavernGamePromptBridge';
import { getRunRecentSummaries, resolveTavernRunBinding } from '../../llm/tavernRunBinding';
import type { ApiSettings } from '../../sillytavern';
import { useGameStore } from '../../store/gameStore';
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
  const transport = transportOverride ?? runtime.transport;

  useEffect(() => {
    if (!runtime.initialized) return;
    if (!latestEvent || !triggerKey) return;
    const initial = useGameStore.getState();
    if (initial.llmDirector.handledTriggers.includes(triggerKey)) return;

    const binding = run.contentMode === 'ai-director'
      ? resolveTavernRunBinding(run, runtime, apiOverride)
      : { ok: false as const, message: '本地 Run 使用预设台词。' };
    if (!binding.ok) {
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
    const node = initial.maze.nodes.find((item) => item.id === run.currentNodeId) ?? initial.maze.nodes[0];
    const prompt = assembleGameDirectorPrompt({
      session: binding.session,
      character: binding.character,
      persona: binding.persona,
      preset: binding.preset,
      lorebooks: binding.lorebooks,
      task: 'quote',
      snapshot: {
        runId: run.id,
        seed: run.seed,
        floor: run.floor,
        nodeId: node.id,
        nodeType: node.type,
        sanity: rosmontis.sanity,
        overload: rosmontis.overload,
        fragmentNames: [...initial.memoryInventory.fragments, ...initial.memoryInventory.coreFragments].map((fragment) => fragment.name),
        recentSummaries: getRunRecentSummaries(binding.session),
      },
      schema: JSON.stringify({ text: '不超过 30 个中文字符的迷迭香第一人称台词' }),
      instruction: `根据刚刚完成的本地规则动作生成即时台词。动作：${describeRuleEvent(latestEvent)}；相关事件：${eventTitle ?? '无'}。`,
    });

    void requestStructuredGameContent({
      transport,
      api: binding.api,
      task: 'quote',
      messages: prompt.messages,
      model: prompt.model,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
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
  }, [apiOverride, eventTitle, latestEvent, rosmontis.overload, rosmontis.sanity, run, runtime, transport, triggerKey]);

  if (!triggerKey || quote?.triggerKey !== triggerKey) return null;
  const sourceLabel = quote.source === 'remote'
    ? '远程生成'
    : run.contentMode === 'ai-director' ? '本地回退' : '本地预设';

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
