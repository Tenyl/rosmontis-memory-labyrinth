import { Activity, ArrowRight, BrainCircuit, Clock3, Database, Gem, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import type { PendingEncounter, RunState } from '../../game/types';
import type { NodePresentation } from '../../llm/schemas/gameDirectorV1';
import { useGameStore } from '../../store/gameStore';
import { useTavern } from '../tavern/runtime/useTavern';

interface NodeSettlementProps {
  encounter: PendingEncounter;
  sanity: number;
  overload: number;
  echoes: number;
  fragmentCount: number;
  canAdvanceFloor?: boolean;
  onAdvanceFloor?: () => void;
  run?: RunState;
  presentation?: NodePresentation;
}

function signed(value: number, suffix = '') {
  return `${value >= 0 ? '+' : ''}${value}${suffix}`;
}

export function NodeSettlement(props: NodeSettlementProps) {
  const start = props.encounter.entrySnapshot ?? {
    sanity: props.sanity,
    overload: props.overload,
    echoes: props.echoes,
    fragments: props.fragmentCount,
  };
  const round = 'round' in props.encounter ? props.encounter.round : null;
  const metrics = [
    { label: '稳定性', value: signed(props.sanity - start.sanity), Icon: Activity },
    { label: '过载', value: signed(props.overload - start.overload, '%'), Icon: BrainCircuit },
    { label: '记忆残响', value: signed(props.echoes - start.echoes), Icon: Database },
    { label: '记忆碎片', value: signed(props.fragmentCount - start.fragments), Icon: Gem },
  ];

  return (
    <section className="node-settlement" aria-labelledby="node-settlement-title">
      {props.run && props.presentation ? <AiSettlementSummary {...props} run={props.run} presentation={props.presentation} /> : null}
      <div className="node-settlement-seal" aria-hidden><ShieldCheck size={38} /></div>
      <div className="node-settlement-copy">
        <span>NODE RESOLVED / DATA RECOVERED</span>
        <h3 id="node-settlement-title">节点结算完成</h3>
        <p>残响信号已经稳定，所得与代价已写入本次潜入记录。</p>
      </div>
      <div className="node-settlement-grid">
        {metrics.map(({ label, value, Icon }) => (
          <article key={label}>
            <Icon size={18} aria-hidden />
            <span>{label}</span>
            <strong>{label} {value}</strong>
          </article>
        ))}
      </div>
      {round !== null && <p className="node-settlement-round"><Clock3 size={16} aria-hidden />完成回合 {round}</p>}
      {props.canAdvanceFloor && props.onAdvanceFloor && (
        <button id="node-settlement-advance-floor" className="terminal-button is-primary node-settlement-advance" type="button" onClick={props.onAdvanceFloor}>
          进入下一层迷宫 <ArrowRight size={17} aria-hidden />
        </button>
      )}
    </section>
  );
}

function AiSettlementSummary(props: NodeSettlementProps & { run: RunState; presentation: NodePresentation }) {
  const runtime = useTavern();
  const addNotification = useGameStore((state) => state.addNotification);
  const chatId = props.run.aiBinding.chatId;
  const nodeId = props.encounter.nodeId;

  useEffect(() => {
    if (props.run.contentMode !== 'ai-director' || !chatId) return;
    let active = true;
    const write = async () => {
      const nodeTrigger = `node:${props.run.id}:${nodeId}`;
      const outcome = `稳定性 ${props.sanity}，过载 ${props.overload}%，记忆残响 ${props.echoes}，碎片 ${props.fragmentCount}`;
      await runtime.appendRunSummary(chatId, {
        triggerKey: nodeTrigger,
        kind: 'node',
        runId: props.run.id,
        floor: props.run.floor,
        nodeId,
        text: `第 ${props.run.floor} 层节点“${props.presentation.title}”已结算。${props.presentation.description} ${outcome}。`,
        createdAt: new Date().toISOString(),
      });
      if (props.presentation.nodeType === 'boss') {
        await runtime.appendRunSummary(chatId, {
          triggerKey: `floor:${props.run.id}:${props.run.floor}`,
          kind: 'floor',
          runId: props.run.id,
          floor: props.run.floor,
          nodeId,
          text: `第 ${props.run.floor} 层探索完成；出口领袖残响已结算。${outcome}。`,
          createdAt: new Date().toISOString(),
        });
      }
    };
    void write().catch((error: unknown) => {
      if (!active) return;
      addNotification({
        id: `notification-run-summary-${nodeId}`,
        kind: 'warning',
        title: 'AI 上下文摘要未写入',
        message: error instanceof Error ? error.message : '绑定会话暂时无法保存节点摘要。',
        dismissible: true,
      });
    });
    return () => { active = false; };
  }, [addNotification, chatId, nodeId, props.echoes, props.fragmentCount, props.overload, props.presentation, props.run, props.sanity, runtime]);

  return null;
}
