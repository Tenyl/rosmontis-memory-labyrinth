import { useEffect } from 'react';
import { parseNovelBlueprint } from '../../llm/gameContent';
import {
  GameContentRequestError,
  requestStructuredGameContent,
} from '../../llm/gameContentClient';
import { buildNovelPrompt } from '../../llm/gamePrompts';
import { createLocalNovelBlueprint } from '../../llm/localNovelBlueprint';
import { createFallbackMindseaBlueprint } from '../../llm/mindseaBlueprint';
import type { ApiSettings } from '../../sillytavern';
import { useGameStore } from '../../store/gameStore';
import { OpenAiTavernTransport } from '../tavern/runtime/openai-tavern-transport';
import type { TavernTransport } from '../tavern/runtime/tavern-transport';
import { useTavern } from '../tavern/runtime/useTavern';

interface NovelRunDirectorProps {
  apiOverride?: ApiSettings | null;
  transportOverride?: TavernTransport;
}

interface ActiveNovelRequest {
  controller: AbortController;
  consumers: number;
}

const defaultTransport = new OpenAiTavernTransport();
const activeRequests = new Map<string, ActiveNovelRequest>();

export function NovelRunDirector({ apiOverride, transportOverride }: NovelRunDirectorProps) {
  const runtime = useTavern();
  const run = useGameStore((state) => state.run);
  const nodes = useGameStore((state) => state.maze.nodes);
  const api = apiOverride === undefined ? runtime.settings?.api ?? null : apiOverride;
  const transport = transportOverride ?? defaultTransport;

  useEffect(() => {
    if (run.mode !== 'novel') return;
    const triggerKey = `${run.id}:novel-blueprint:${run.floor}`;
    const initial = useGameStore.getState();
    if (initial.llmDirector.handledTriggers.includes(triggerKey)) return;
    const expectedNodes = nodes.map(({ id, type }) => ({ id, type }));

    if (!api?.apiKey.trim()) {
      const token = initial.beginDirectorRequest('novel', triggerKey);
      initial.markDirectorTriggerHandled(triggerKey);
      initial.acceptNovelBlueprint(
        token,
        triggerKey,
        createFallbackBlueprint(run.seed, run.floor, nodes, initial.memoryInventory.fragments.map((fragment) => fragment.name)),
        'local-fallback',
      );
      return;
    }

    const existing = activeRequests.get(triggerKey);
    if (existing) {
      existing.consumers += 1;
      return () => releaseRequest(triggerKey, existing);
    }

    const active: ActiveNovelRequest = { controller: new AbortController(), consumers: 1 };
    activeRequests.set(triggerKey, active);
    const token = initial.beginDirectorRequest('novel', triggerKey);
    const fragmentNames = [
      ...initial.memoryInventory.fragments,
      ...initial.memoryInventory.coreFragments,
    ].map((fragment) => fragment.name);

    void requestStructuredGameContent({
      transport,
      api,
      task: 'novel',
      messages: buildNovelPrompt({
        seed: run.seed,
        floor: run.floor,
        sanity: initial.rosmontis.sanity,
        overload: initial.rosmontis.overload,
        fragmentNames,
        nodes: expectedNodes,
      }),
      parse: (value) => parseNovelBlueprint(value, expectedNodes),
      signal: active.controller.signal,
    }).then((content) => {
      const latest = useGameStore.getState();
      if (latest.run.id !== run.id) return;
      latest.markDirectorTriggerHandled(triggerKey);
      latest.acceptNovelBlueprint(token, triggerKey, content, 'remote');
    }).catch((error: unknown) => {
      if (isAborted(error, active.controller.signal)) return;
      const latest = useGameStore.getState();
      if (latest.run.id !== run.id) return;
      latest.markDirectorTriggerHandled(triggerKey);
      latest.acceptNovelBlueprint(
        token,
        triggerKey,
        createFallbackBlueprint(run.seed, run.floor, nodes, latest.memoryInventory.fragments.map((fragment) => fragment.name)),
        'local-fallback',
      );
      latest.addNotification({
        id: 'notification-llm-novel-fallback',
        kind: 'warning',
        title: '小说蓝图已切换至本地叙事',
        message: `${directorFailureLabel(error)}；本地拓扑、规则和 Run 进度均未改变。`,
        dismissible: true,
      });
    }).finally(() => {
      if (activeRequests.get(triggerKey) === active) activeRequests.delete(triggerKey);
    });

    return () => releaseRequest(triggerKey, active);
  }, [api, nodes, run.floor, run.id, run.mode, run.seed, transport]);

  return null;
}

function createFallbackBlueprint(seed: string, floor: number, nodes: Parameters<typeof createLocalNovelBlueprint>[2], fragments: string[]) {
  const local = createLocalNovelBlueprint(seed, floor, nodes);
  return floor >= 6 ? { ...local, ...createFallbackMindseaBlueprint(seed, floor, fragments) } : local;
}

function releaseRequest(triggerKey: string, active: ActiveNovelRequest) {
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

function directorFailureLabel(error: unknown) {
  if (!(error instanceof GameContentRequestError)) return '远程蓝图请求失败';
  const labels: Record<GameContentRequestError['code'], string> = {
    configuration: '远程模型配置不完整',
    transport: '远程模型连接失败',
    'invalid-response': '远程蓝图未通过节点一致性校验',
    aborted: '远程蓝图请求已取消',
  };
  return labels[error.code];
}
