import { useEffect, useRef } from 'react';
import type { DiaryDraft } from '../../game/types';
import { persistDiaryDraft } from '../../diary/repository';
import { requestStructuredGameContent, type GameContentRequestError } from '../../llm/gameContentClient';
import { buildDiaryPrompt } from '../../llm/gamePrompts';
import { parseDiaryV1 } from '../../llm/schemas/diaryV1';
import type { ApiSettings } from '../../sillytavern';
import { useGameStore } from '../../store/gameStore';
import { OpenAiTavernTransport } from '../tavern/runtime/openai-tavern-transport';
import type { TavernTransport } from '../tavern/runtime/tavern-transport';
import { useTavern } from '../tavern/runtime/useTavern';

interface DiaryDirectorProps {
  apiOverride?: ApiSettings | null;
  transportOverride?: TavernTransport;
  persistOverride?: typeof persistDiaryDraft;
}

const defaultTransport = new OpenAiTavernTransport();

export function DiaryDirector({ apiOverride, transportOverride, persistOverride }: DiaryDirectorProps) {
  const runtime = useTavern();
  const drafts = useGameStore((state) => state.pendingDiaryDrafts);
  const api = apiOverride === undefined ? runtime.settings?.api ?? null : apiOverride;
  const transport = transportOverride ?? defaultTransport;
  const persist = persistOverride ?? persistDiaryDraft;
  const processing = useRef(new Set<string>());

  useEffect(() => {
    drafts.forEach((draft) => {
      const state = useGameStore.getState();
      const triggerKey = `diary:${draft.triggerKey}`;
      if (state.llmDirector.handledTriggers.includes(triggerKey)) {
        state.acknowledgeDiaryDraft(draft.id);
        return;
      }
      if (processing.current.has(draft.id)) return;
      processing.current.add(draft.id);
      void processDraft({ draft, api, transport, persist, triggerKey })
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
  }, [api, drafts, persist, transport]);

  return null;
}

interface ProcessDraftOptions {
  draft: DiaryDraft;
  api: ApiSettings | null;
  transport: TavernTransport;
  persist: typeof persistDiaryDraft;
  triggerKey: string;
}

async function processDraft({ draft, api, transport, persist, triggerKey }: ProcessDraftOptions) {
  const initial = useGameStore.getState();
  const floor = draft.floor ?? initial.run.floor;
  const runId = draft.runId ?? initial.run.id;
  let contentDraft = draft;
  let token: string | null = null;
  let fallbackReason: unknown = null;

  if (api?.apiKey.trim() && api.baseUrl.trim() && api.model.trim()) {
    token = initial.beginDirectorRequest('diary', triggerKey);
    try {
      const content = await requestStructuredGameContent({
        transport,
        api,
        task: 'diary',
        messages: buildDiaryPrompt({
          triggerKey: draft.triggerKey,
          floor,
          sanity: initial.rosmontis.sanity,
          overload: initial.rosmontis.overload,
          localTitle: draft.title,
          localBody: draft.body,
          fragmentNames: [
            ...initial.memoryInventory.fragments,
            ...initial.memoryInventory.coreFragments,
          ].map((fragment) => fragment.name),
        }),
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
