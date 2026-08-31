import { useEffect, useRef } from 'react';
import type { DiaryDraft } from '../../game/types';
import { persistDiaryDraft } from '../../diary/repository';
import { requestStructuredGameContent, type GameContentRequestError } from '../../llm/gameContentClient';
import { parseDiaryV1 } from '../../llm/schemas/diaryV1';
import { assembleGameDirectorPrompt } from '../../llm/tavernGamePromptBridge';
import { getRunRecentSummaries, resolveTavernRunBinding } from '../../llm/tavernRunBinding';
import type { ApiSettings } from '../../sillytavern';
import { useGameStore } from '../../store/gameStore';
import type { TavernTransport } from '../tavern/runtime/tavern-transport';
import { useTavern } from '../tavern/runtime/useTavern';

interface DiaryDirectorProps {
  apiOverride?: ApiSettings | null;
  transportOverride?: TavernTransport;
  persistOverride?: typeof persistDiaryDraft;
}

export function DiaryDirector({ apiOverride, transportOverride, persistOverride }: DiaryDirectorProps) {
  const runtime = useTavern();
  const drafts = useGameStore((state) => state.pendingDiaryDrafts);
  const transport = transportOverride ?? runtime.transport;
  const persist = persistOverride ?? persistDiaryDraft;
  const processing = useRef(new Set<string>());

  useEffect(() => {
    if (!runtime.initialized) return;
    drafts.forEach((draft) => {
      const state = useGameStore.getState();
      const triggerKey = `diary:${draft.triggerKey}`;
      if (state.llmDirector.handledTriggers.includes(triggerKey)) {
        state.acknowledgeDiaryDraft(draft.id);
        return;
      }
      if (processing.current.has(draft.id)) return;
      processing.current.add(draft.id);
      const binding = state.run.contentMode === 'ai-director' && (draft.runId ?? state.run.id) === state.run.id
        ? resolveTavernRunBinding(state.run, runtime, apiOverride)
        : { ok: false as const, message: '本地 Run 不调用远程手记生成。' };
      void processDraft({ draft, binding, transport, persist, triggerKey })
        .catch(() => {
          processing.current.delete(draft.id);
          useGameStore.getState().addNotification({
            id: `notification-diary-write-${draft.id}`,
            kind: 'danger',
            title: '手记写入暂时失败',
            message: 'IndexedDB 无法保存这篇手记；草稿仍保留在本地状态，节点结算与 Run 进度没有回滚。',
            dismissible: true,
          });
        });
    });
  }, [apiOverride, drafts, persist, runtime, transport]);

  return null;
}

interface ProcessDraftOptions {
  draft: DiaryDraft;
  binding: ReturnType<typeof resolveTavernRunBinding>;
  transport: TavernTransport;
  persist: typeof persistDiaryDraft;
  triggerKey: string;
}

async function processDraft({ draft, binding, transport, persist, triggerKey }: ProcessDraftOptions) {
  const initial = useGameStore.getState();
  const floor = draft.floor ?? initial.run.floor;
  const runId = draft.runId ?? initial.run.id;
  let contentDraft = draft;
  let token: string | null = null;
  let fallbackReason: unknown = null;

  if (binding.ok) {
    token = initial.beginDirectorRequest('diary', triggerKey);
    try {
      const node = initial.maze.nodes.find((item) => item.id === initial.run.currentNodeId) ?? initial.maze.nodes[0];
      const prompt = assembleGameDirectorPrompt({
        session: binding.session,
        character: binding.character,
        persona: binding.persona,
        preset: binding.preset,
        lorebooks: binding.lorebooks,
        task: 'diary',
        snapshot: {
          runId: initial.run.id,
          seed: initial.run.seed,
          floor,
          nodeId: node.id,
          nodeType: node.type,
          sanity: initial.rosmontis.sanity,
          overload: initial.rosmontis.overload,
          fragmentNames: [
            ...initial.memoryInventory.fragments,
            ...initial.memoryInventory.coreFragments,
          ].map((fragment) => fragment.name),
          recentSummaries: getRunRecentSummaries(binding.session),
        },
        schema: JSON.stringify({ title: '不超过 48 字', body: '迷迭香第一人称手记正文' }),
        instruction: `根据已结算的本地草稿生成一篇迷迭香手记。触发键：${draft.triggerKey}；本地标题：${draft.title}；本地正文：${draft.body}`,
      });
      const content = await requestStructuredGameContent({
        transport,
        api: binding.api,
        task: 'diary',
        messages: prompt.messages,
        model: prompt.model,
        temperature: prompt.temperature,
        maxTokens: prompt.maxTokens,
        parse: parseDiaryV1,
        signal: new AbortController().signal,
      });
      contentDraft = { ...draft, ...content, source: 'remote' };
    } catch (error) {
      fallbackReason = error;
    }
  }

  await persist(contentDraft, runId, floor);
  const latest = useGameStore.getState();
  if (token) latest.completeDirectorRequest('diary', token);
  latest.markDirectorTriggerHandled(triggerKey);
  latest.acknowledgeDiaryDraft(draft.id);

  if (fallbackReason) {
    latest.addNotification({
      id: `notification-diary-fallback-${draft.id}`,
      kind: 'warning',
      title: '手记已使用本地草稿',
      message: `${diaryFailureLabel(fallbackReason)}；这篇手记已安全保存，局内数值与 Run 进度均未改变。`,
      dismissible: true,
    });
  }
}

function diaryFailureLabel(error: unknown) {
  if (!isGameContentRequestError(error)) return '远程手记生成失败';
  const labels: Record<GameContentRequestError['code'], string> = {
    configuration: '远程模型配置不完整',
    transport: '远程模型连接失败',
    'invalid-response': '远程手记未通过结构校验',
    timeout: '远程手记生成超时',
    aborted: '远程手记生成已取消',
  };
  return labels[error.code];
}

function isGameContentRequestError(error: unknown): error is GameContentRequestError {
  return error instanceof Error && error.name === 'GameContentRequestError' && 'code' in error;
}
