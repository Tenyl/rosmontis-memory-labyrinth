import { ArrowUpRight, Heart, Lightning, Pulse, ShieldChevron, UsersThree } from '@phosphor-icons/react';
import { Meter } from '../../components/Meter';
import type { Operator } from '../../types/game';

interface SquadRosterProps {
  operators: Operator[];
  formation: string;
  onOpen: (operator: Operator) => void;
}

export function SquadRoster({ operators, formation, onOpen }: SquadRosterProps) {
  return (
    <section className="squad-roster" aria-labelledby="squad-roster-title">
      <header className="squad-roster-header">
        <div><span className="panel-code">FIELD TEAM / ESCORT</span><h2 id="squad-roster-title">随行小队</h2><p>{formation} · 通讯链路 98.7%</p></div>
        <div className="formation-diagram" aria-hidden="true"><i /><i /><i /><i /></div>
      </header>
      <div className="squad-card-grid">
        {operators.map((operator, index) => (
          <article key={operator.id} className="squad-card">
            <header>
              <div className={`operator-sigil is-squad is-${operator.id}`} aria-hidden="true"><span>{operator.name.slice(0, 1)}</span><b>{String(index + 1).padStart(2, '0')}</b></div>
              <div><span className="panel-code">{operator.code}</span><h3>{operator.name}</h3><p>{operator.role}</p></div>
              <span className={`operator-condition${operator.stress >= 25 ? ' is-warning' : ''}`}><i />{operator.condition}</span>
            </header>
            <div className="squad-meters">
              <Meter id={`operator-health-${operator.id}`} label="生命状态" value={operator.health} tone="arts" />
              <Meter id={`operator-stress-${operator.id}`} label="精神负荷" value={operator.stress} tone={operator.stress >= 25 ? 'warning' : 'memory'} />
            </div>
            <dl className="squad-tactical-data">
              <div><dt><Lightning size={14} aria-hidden />行动点</dt><dd>{operator.actionPoints} AP</dd></div>
              <div><dt><ShieldChevron size={14} aria-hidden />战术位置</dt><dd>{operator.position}</dd></div>
              <div><dt><Pulse size={14} aria-hidden />下一行动</dt><dd>{operator.nextAction}</dd></div>
            </dl>
            <button id={`operator-dossier-open-${operator.id}`} type="button" onClick={() => onOpen(operator)} aria-label={`查看${operator.name}完整档案`}>
              查看完整档案<ArrowUpRight size={16} aria-hidden />
            </button>
          </article>
        ))}
      </div>
      <div className="squad-footer"><UsersThree size={17} aria-hidden /><span>4 名干员全部在线</span><i /><Heart size={15} weight="fill" aria-hidden /><span>医疗响应正常</span></div>
    </section>
  );
}
