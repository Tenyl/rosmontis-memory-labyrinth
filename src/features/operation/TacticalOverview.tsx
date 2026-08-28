import { Crosshair, MapPin, Pulse, UsersThree } from '@phosphor-icons/react';
import { Meter } from '../../components/Meter';
import { StatusBadge } from '../../components/StatusBadge';
import type { Operator, SessionState } from '../../types/game';

interface TacticalOverviewProps {
  session: SessionState;
  operators: Operator[];
}

export function TacticalOverview({ session, operators }: TacticalOverviewProps) {
  const rosmontis = operators[0];

  return (
    <aside className="tactical-overview" aria-labelledby="tactical-overview-title">
      <header className="tactical-overview-header">
        <div>
          <span className="panel-code">TACTICAL OVERVIEW</span>
          <h2 id="tactical-overview-title">罗德岛战术概况</h2>
        </div>
        <StatusBadge label={`风险 ${session.globalRisk}`} tone="warning" />
      </header>

      <section className="objective-card" aria-labelledby="current-objective-title">
        <span><Crosshair size={16} weight="fill" aria-hidden />当前目标</span>
        <h3 id="current-objective-title">{session.objective}</h3>
        <div><MapPin size={14} aria-hidden />R-09 隔离区 / 东翼下层</div>
      </section>

      {rosmontis ? (
        <section className="overview-vitals" aria-label="迷迭香实时状态">
          <div className="overview-section-title">
            <span>RSM-04 / 迷迭香</span>
            <small>神经链路在线</small>
          </div>
          <Meter id="operation-rosmontis-stress" label="精神负荷" value={rosmontis.stress} tone={rosmontis.stress >= 55 ? 'warning' : 'memory'} status={rosmontis.condition} />
          <Meter id="operation-rosmontis-sanity" label="理智稳定度" value={rosmontis.sanity ?? 0} tone="arts" />
        </section>
      ) : null}

      <section className="turn-order" aria-labelledby="turn-order-title">
        <div className="overview-section-title">
          <span id="turn-order-title"><UsersThree size={15} aria-hidden />行动序列</span>
          <small>{operators.length} 名干员</small>
        </div>
        <ol>
          {operators.map((operator, index) => (
            <li key={operator.id} className={index === 0 ? 'is-current' : ''}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div><strong>{operator.name}</strong><small>{operator.position} · {operator.nextAction}</small></div>
              <em>{operator.actionPoints} AP</em>
            </li>
          ))}
        </ol>
      </section>

      <section className="pending-intel" aria-labelledby="pending-intel-title">
        <div className="overview-section-title">
          <span id="pending-intel-title"><Pulse size={15} aria-hidden />待处理情报</span>
          <small>03</small>
        </div>
        <ul>
          <li><i className="is-warning" />护理员伊莲身份尚未验证</li>
          <li><i className="is-memory" />广播时间戳存在三重叠加</li>
          <li><i className="is-arts" />东侧病房供电仍可利用</li>
        </ul>
      </section>
    </aside>
  );
}
