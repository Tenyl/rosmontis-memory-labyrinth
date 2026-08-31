import { useEffect } from 'react';
import { parseNovelBlueprint } from '../../llm/gameContent';
import {
  GameContentRequestError,
  requestStructuredGameContent,
} from '../../llm/gameContentClient';
import { createLocalNovelBlueprint } from '../../llm/localNovelBlueprint';
import { createFallbackMindseaBlueprint } from '../../llm/mindseaBlueprint';
import { parseMindseaFloorV1 } from '../../llm/schemas/mindseaFloorV1';
import { assembleGameDirectorPrompt } from '../../llm/tavernGamePromptBridge';
import { getRunRecentSummaries, resolveTavernRunBinding } from '../../llm/tavernRunBinding';
import type { ApiSettings } from '../../sillytavern';
import { useGameStore } from '../../store/gameStore';
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

const activeRequests = new Map<string, ActiveNovelRequest>();

export function NovelRunDirector({ apiOverride, transportOverride }: NovelRunDirectorProps) {
  const runtime = useTavern();
  const run = useGameStore((state) => state.run);
  const nodes = useGameStore((state) => state.maze.nodes);
  const transport = transportOverride ?? runtime.transport;

  useEffect(() => {
    if (!runtime.initialized) return;
    if (run.mode !== 'novel') return;
    const triggerKey = `${run.id}:novel-blueprint:${run.floor}`;
    const initial = useGameStore.getState();
    if (initial.llmDirector.handledTriggers.includes(triggerKey)) return;
    const expectedNodes = nodes.map(({ id, type }) => ({ id, type }));

    const binding = resolveTavernRunBinding(run, runtime, apiOverride);
    if (!binding.ok) {
      const task = run.floor >= 6 ? 'mindsea' : 'novel';
      const token = initial.beginDirectorRequest(task, triggerKey);
      initial.markDirectorTriggerHandled(triggerKey);
      initial.acceptNovelBlueprint(
        token,
        triggerKey,
        createFallbackBlueprint(run.seed, run.floor, nodes, [
          ...initial.memoryInventory.fragments,
          ...initial.memoryInventory.coreFragments,
        ].map((fragment) => fragment.name)),
        'local-fallback',
        task,
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
    const task = run.floor >= 6 ? 'mindsea' : 'novel';
    const token = initial.beginDirectorRequest(task, triggerKey);
    const fragmentNames = [
      ...initial.memoryInventory.fragments,
      ...initial.memoryInventory.coreFragments,
    ].map((fragment) => fragment.name);
    const currentNode = nodes.find((node) => node.id === run.currentNodeId) ?? nodes[0];
    const prompt = assembleGameDirectorPrompt({
      session: binding.session,
      character: binding.character,
      persona: binding.persona,
      preset: binding.preset,
      lorebooks: binding.lorebooks,
      task,
      snapshot: {
        runId: run.id,
        seed: run.seed,
        floor: run.floor,
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        sanity: initial.rosmontis.sanity,
        overload: initial.rosmontis.overload,
        fragmentNames,
        recentSummaries: getRunRecentSummaries(binding.session),
      },
      schema: JSON.stringify({
        title: 'string', theme: 'string', premise: 'string', endingHook: 'string',
        nodeBriefs: expectedNodes.map((node) => ({ nodeId: node.id, nodeType: node.type, title: 'string', description: 'string' })),
      }),
      instruction: run.floor >= 6
        ? '依据本 Run 已找回的记忆与历史摘要，为无垠心海生成本层主题和每个既定节点的叙事说明。不得修改节点 ID、类型或拓扑。'
        : '为小说剧情模式生成本层主题和每个既定节点的叙事说明。不得修改节点 ID、类型或拓扑。',
    });

    void requestStructuredGameContent({
      transport,
      api: binding.api,
      task,
      messages: prompt.messages,
      model: prompt.model,
      temperature: prompt.temperature,
      maxTokens: prompt.maxTokens,
      parse: (value) => run.floor >= 6
        ? parseMindseaFloorV1(value, expectedNodes)
        : parseNovelBlueprint(value, expectedNodes),
      signal: active.controller.signal,
    }).then((content) => {
      const latest = useGameStore.getState();
      if (latest.run.id !== run.id) return;
      latest.markDirectorTriggerHandled(triggerKey);
      latest.acceptNovelBlueprint(token, triggerKey, content, 'remote', task);
    }).catch((error: unknown) => {
      if (isAborted(error, active.controller.signal)) return;
      const latest = useGameStore.getState();
      if (latest.run.id !== run.id) return;
      latest.markDirectorTriggerHandled(triggerKey);
      latest.acceptNovelBlueprint(
        token,
        triggerKey,
        createFallbackBlueprint(run.seed, run.floor, nodes, [
          ...latest.memoryInventory.fragments,
          ...latest.memoryInventory.coreFragments,
        ].map((fragment) => fragment.name)),
        'local-fallback',
        task,
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
  }, [apiOverride, nodes, run, runtime, transport]);

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
    timeout: '远程蓝图请求超时',
    aborted: '远程蓝图请求已取消',
  };
  return labels[error.code];
}
