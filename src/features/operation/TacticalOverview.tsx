import {
  Crosshair,
  Zap as Lightning,
  MapPin,
  Activity as Pulse,
} from 'lucide-react';
import { Meter } from '../../components/Meter';
import { StatusBadge } from '../../components/StatusBadge';
import type { Operator, SessionState } from '../../types/game';
import { ProvenanceLink } from '../tavern/projection/ProvenanceLink';

interface TacticalOverviewProps {
  session: SessionState;
  rosmontis?: Operator;
}

export function TacticalOverview({ session, rosmontis }: TacticalOverviewProps) {
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
        <span><Crosshair size={16} aria-hidden />当前目标</span>
        <h3 id="current-objective-title">{session.objective}</h3>
        <div><MapPin size={14} aria-hidden />R-09 隔离区 / 东翼下层</div>
        <ProvenanceLink sessionId={session.sourceSessionId} messageId={session.sourceMessageId} matchedLorebookEntryIds={session.matchedLorebookEntryIds} idSuffix="operation-session" />
      </section>

      {rosmontis ? (
        <section className="overview-vitals" aria-label="迷迭香实时状态">
          <div className="overview-section-title">
            <span>RSM-04 / 迷迭香</span>
            <small>{session.squadStatus}</small>
          </div>
          <Meter id="operation-rosmontis-stress" label="精神负荷" value={rosmontis.stress} tone={rosmontis.stress >= 55 ? 'warning' : 'memory'} status={rosmontis.condition} />
          <Meter id="operation-rosmontis-sanity" label="理智稳定度" value={rosmontis.sanity ?? 0} tone="arts" />
        </section>
      ) : null}

      <section className="turn-order" aria-labelledby="turn-order-title">
        <div className="overview-section-title">
          <h3 id="turn-order-title"><Lightning size={15} aria-hidden />迷迭香行动资源</h3>
          <small>{rosmontis?.actionPoints ?? 0} AP 可用</small>
        </div>
        <ol>
          <li className="is-current">
            <span>01</span>
            <div><strong>当前行动</strong><small>{rosmontis?.nextAction ?? '等待指挥'}</small></div>
            <em>{rosmontis?.actionPoints ?? 0} AP</em>
          </li>
          <li>
            <span>02</span>
            <div><strong>战术定位</strong><small>{rosmontis?.position ?? '单人认知潜入'}</small></div>
            <em>RSM</em>
          </li>
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
