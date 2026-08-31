import { RotateCcw, ShieldCheck, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MazeNode, RunState } from '../../game/types';
import { LocalContentDriver } from '../../llm/contentDriver';
import { requestStructuredGameContent } from '../../llm/gameContentClient';
import { parseGameDirectorV1, type NodePresentation } from '../../llm/schemas/gameDirectorV1';
import { assembleGameDirectorPrompt } from '../../llm/tavernGamePromptBridge';
import { getRunRecentSummaries, resolveTavernRunBinding } from '../../llm/tavernRunBinding';
import { useGameStore } from '../../store/gameStore';
import { useTavern } from '../tavern/runtime/useTavern';
import { AiTacticalCommandConsole } from '../operation/AiTacticalCommandConsole';

interface GameDirectorBoundaryProps {
  run: RunState;
  node: MazeNode;
  children: (presentation: NodePresentation) => ReactNode;
}

type DirectorStage = 'idle' | 'loading' | 'ready' | 'error';
const localDriver = new LocalContentDriver();
const activeRequests = new Map<string, Promise<NodePresentation>>();

const GAME_DIRECTOR_SCHEMA = JSON.stringify({
  version: 1,
  nodeId: '本地节点 ID',
  nodeType: '本地节点类型',
  title: '节点标题',
  description: '节点叙事',
  choiceIds: ['已注册选项 ID'],
  modifierIds: ['已注册修饰词 ID'],
  enemyPlan: { intentIds: ['assault', 'charge', 'erosion'] },
  quote: '迷迭香第一人称短句',
});

export function GameDirectorBoundary({ run, node, children }: GameDirectorBoundaryProps) {
  const runtime = useTavern();
  const stored = useGameStore((state) => state.llmDirector.presentations[`${run.id}:${node.id}`] ?? null);
  const acceptPresentation = useGameStore((state) => state.acceptNodePresentation);
  const setAiFailurePolicy = useGameStore((state) => state.setAiFailurePolicy);
  const [stage, setStage] = useState<DirectorStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const localPresentation = useMemo(() => localDriver.resolveNode({ run, node }), [node, run]);
  const aiMode = run.contentMode === 'ai-director';

  useEffect(() => {
    if (aiMode || stored) return;
    acceptPresentation(localPresentation);
  }, [acceptPresentation, aiMode, localPresentation, stored]);

  useEffect(() => {
    if (!aiMode || stored) return;
    const binding = resolveTavernRunBinding(run, runtime);
    if (!binding.ok) {
      setStage('error');
      setError(binding.message);
      if (run.aiFailurePolicy === 'auto-fallback') acceptPresentation(asFallback(localPresentation));
      return;
    }

    const requestKey = `${run.id}:${node.id}:${retry}`;
    setStage('loading');
    setError(null);
    let request = activeRequests.get(requestKey);
    if (!request) {
      const prompt = assembleGameDirectorPrompt({
        session: binding.session,
        character: binding.character,
        persona: binding.persona,
        preset: binding.preset,
        lorebooks: binding.lorebooks,
        task: 'event',
        snapshot: {
          runId: run.id,
          seed: run.seed,
          floor: run.floor,
          nodeId: node.id,
          nodeType: node.type,
          sanity: useGameStore.getState().rosmontis.sanity,
          overload: useGameStore.getState().rosmontis.overload,
          fragmentNames: [
            ...useGameStore.getState().memoryInventory.fragments,
            ...useGameStore.getState().memoryInventory.coreFragments,
          ].map((fragment) => fragment.name),
          recentSummaries: getRunRecentSummaries(binding.session),
        },
        schema: GAME_DIRECTOR_SCHEMA,
        instruction: '为当前节点生成与本地规则一致的中文展示内容，只能引用已注册 ID。',
      });
      request = requestStructuredGameContent({
        transport: runtime.transport,
        api: binding.api,
        task: 'event',
        messages: prompt.messages,
        model: prompt.model,
        temperature: prompt.temperature,
        maxTokens: prompt.maxTokens,
        signal: new AbortController().signal,
        parse: (value) => ({
          ...parseGameDirectorV1(value, { runId: run.id, nodeId: node.id, nodeType: node.type }),
          matchedLorebookEntryIds: prompt.matchedLorebookEntryIds,
        }),
      });
      activeRequests.set(requestKey, request);
      void request.then(
        () => activeRequests.delete(requestKey),
        () => activeRequests.delete(requestKey),
      );
    }
    let current = true;
    void request.then((presentation) => {
      if (!current) return;
      acceptPresentation(presentation);
      setStage('ready');
    }).catch(() => {
      if (!current) return;
      setStage('error');
      setError('AI 导演内容未能通过校验或网络连接暂时不可用。');
      if (run.aiFailurePolicy === 'auto-fallback') acceptPresentation(asFallback(localPresentation));
    });
    return () => { current = false; };
  }, [acceptPresentation, aiMode, localPresentation, node, retry, run, runtime, stored]);

  const useLocal = (always: boolean) => {
    if (always) setAiFailurePolicy('auto-fallback');
    acceptPresentation(asFallback(localPresentation));
    setStage('ready');
    setError(null);
  };
  const presentation = stored ?? localPresentation;

  return (
    <>
      {children(presentation)}
      {aiMode ? (
        <section id="game-director-status" className={`game-director-status is-${stage}`} aria-label="AI 导演状态">
          <div>
            {stage === 'error' ? <WifiOff aria-hidden /> : <ShieldCheck aria-hidden />}
            <span><strong>AI 导演</strong><small>{stored ? '节点叙事已融合至当前界面' : stage === 'loading' ? '正在读取角色卡、预设与世界书' : error ?? '等待节点上下文'}</small></span>
          </div>
          {stage === 'error' && run.aiFailurePolicy === 'ask' ? (
            <div className="game-director-decisions">
              <button id="game-director-retry" type="button" onClick={() => setRetry((value) => value + 1)}><RotateCcw size={16} aria-hidden />重试</button>
              <button id="game-director-use-local" type="button" onClick={() => useLocal(false)}>本节点使用本地内容</button>
              <button id="game-director-always-local" type="button" onClick={() => useLocal(true)}>本次潜入始终回退</button>
            </div>
          ) : null}
        </section>
      ) : null}
      {aiMode ? <div id="game-ai-command-slot" className="game-ai-command-slot" data-ready={stored?.source === 'ai-director' ? 'true' : 'false'}>
        {stored?.source === 'ai-director'
          ? <AiTacticalCommandConsole run={run} node={node} presentation={stored} />
          : <><span>自然语言战术通道</span><small>等待有效的 AI 节点上下文</small></>}
      </div> : null}
    </>
  );
}

function asFallback(presentation: NodePresentation): NodePresentation {
  return { ...presentation, source: 'local-fallback' };
}
