import { Activity, ArrowRight, BrainCircuit, Clock3, Database, Gem, ShieldCheck } from 'lucide-react';
import type { PendingEncounter } from '../../game/types';

interface NodeSettlementProps {
  encounter: PendingEncounter;
  sanity: number;
  overload: number;
  echoes: number;
  fragmentCount: number;
  canAdvanceFloor?: boolean;
  onAdvanceFloor?: () => void;
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
