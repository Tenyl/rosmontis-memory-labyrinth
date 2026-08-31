import { useRef, useState } from 'react';
import type { MazeNode, RunState } from '../../game/types';
import { requestStructuredGameContent } from '../../llm/gameContentClient';
import { parseTacticalCommandV1, TACTICAL_ACTION_IDS } from '../../llm/schemas/tacticalCommandV1';
import type { NodePresentation } from '../../llm/schemas/gameDirectorV1';
import { assembleGameDirectorPrompt } from '../../llm/tavernGamePromptBridge';
import { getRunRecentSummaries, resolveTavernRunBinding } from '../../llm/tavernRunBinding';
import { useGameStore } from '../../store/gameStore';
import { useTavern } from '../tavern/runtime/useTavern';
import type { TavernRuntimeStatus } from '../tavern/runtime/TavernProvider';
import { CommandConsole } from './CommandConsole';

interface AiTacticalCommandConsoleProps {
  run: RunState;
  node: MazeNode;
  presentation: NodePresentation;
}

export function AiTacticalCommandConsole({ run, node, presentation }: AiTacticalCommandConsoleProps) {
  const runtime = useTavern();
  const inputMode = useGameStore((state) => state.narrative.inputMode);
  const setInputMode = useGameStore((state) => state.setInputMode);
  const resolveTacticalCommand = useGameStore((state) => state.resolveTacticalCommand);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<TavernRuntimeStatus>('ready');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const combat = node.type === 'combat' || node.type === 'emergency-combat' || node.type === 'boss';
  if (!combat || presentation.source !== 'ai-director') return null;

  const submit = async () => {
    const playerText = draft.trim();
    if (!playerText) {
      setError('请先描述想要执行的战术。');
      return;
    }
    const binding = resolveTavernRunBinding(run, runtime);
    if (!binding.ok) {
      setError(binding.message);
      return;
    }
    const game = useGameStore.getState();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('assembling');
    setError(null);
    setFeedback(null);
    try {
      const prompt = assembleGameDirectorPrompt({
        session: binding.session, character: binding.character, persona: binding.persona, preset: binding.preset, lorebooks: binding.lorebooks, task: 'tactical-command',
        snapshot: {
          runId: run.id, seed: run.seed, floor: run.floor, nodeId: node.id, nodeType: node.type,
          sanity: game.rosmontis.sanity, overload: game.rosmontis.overload,
          fragmentNames: [...game.memoryInventory.fragments, ...game.memoryInventory.coreFragments].map((fragment) => fragment.name),
          recentSummaries: getRunRecentSummaries(binding.session),
          playerText,
          tacticalState: {
            actionPoints: game.rosmontis.actionPoints,
            cooldowns: Object.fromEntries(Object.entries(game.rosmontis.greatswords).map(([id, sword]) => [id, sword.cooldown])),
            encounterKind: game.pendingEncounter?.kind ?? null,
            ...(game.pendingEncounter?.kind === 'boss' ? { bossPhase: game.pendingEncounter.phase } : {}),
          },
        },
        schema: JSON.stringify({ version: 1, actionIds: TACTICAL_ACTION_IDS, explanation: 'string' }),
        instruction: '把玩家的自然语言战术翻译为 1 至 4 个已注册动作 ID；不要预测或输出任何数值。',
      });
      setStatus('streaming');
      const plan = await requestStructuredGameContent({
        transport: runtime.transport, api: binding.api, task: 'tactical-command', messages: prompt.messages,
        model: prompt.model, temperature: prompt.temperature, maxTokens: prompt.maxTokens,
        signal: controller.signal, parse: parseTacticalCommandV1,
      });
      const resolution = resolveTacticalCommand(plan);
      if (!resolution.accepted) throw new Error(resolution.reason ?? '这组战术无法完整执行。');
      setDraft('');
      setFeedback(plan.explanation);
      setStatus('complete');
    } catch (reason) {
      if (controller.signal.aborted) {
        setStatus('interrupted');
      } else {
        setStatus('failed');
        setError(reason instanceof Error ? reason.message : '战术指令解析失败。');
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  return (
    <div className="ai-tactical-command">
      {feedback ? <p className="ai-tactical-feedback" role="status">{feedback}</p> : null}
      <CommandConsole
        draft={draft}
        inputMode={inputMode}
        suggestions={['先建立屏障，再用破壁打断敌方', '集中使用破壁削减硬直', '呼唤迷迭香并稳住当前回合']}
        status={status}
        transportMode="remote"
        error={error}
        dataNotice="指令会发送至本存档绑定的模型；最终动作仍由本地规则校验"
        onDraftChange={(value) => { setDraft(value); setError(null); }}
        onModeChange={setInputMode}
        onSubmit={() => void submit()}
        onStop={() => abortRef.current?.abort()}
      />
    </div>
  );
}
