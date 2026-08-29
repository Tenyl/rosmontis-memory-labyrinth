import {
  Brain,
  FirstAidKit,
  Heartbeat,
  Hexagon,
  Lightning,
  ShieldCheck,
  Sparkle,
  Waveform,
} from '@phosphor-icons/react';
import { CharacterArtwork } from '../../components/CharacterArtwork';
import { Meter } from '../../components/Meter';
import { StatusBadge } from '../../components/StatusBadge';
import type { Operator } from '../../types/game';
import { ProvenanceLink } from '../tavern/projection/ProvenanceLink';

interface RosmontisProfileProps {
  operator: Operator;
}

export function RosmontisProfile({ operator }: RosmontisProfileProps) {
  const attributes = [
    ...operator.attributes,
    { label: '体能', value: 11, modifier: 0 },
    { label: '医疗适应', value: 14, modifier: 1 },
  ];

  return (
    <article className="rosmontis-profile" aria-labelledby="rosmontis-profile-title">
      <header className="rosmontis-identity">
        <CharacterArtwork kind="portrait" label="迷迭香立绘占位" className="rosmontis-portrait" />
        <div className="rosmontis-identity-copy">
          <span className="panel-code">ELITE OPERATOR / {operator.code}</span>
          <h2 id="rosmontis-profile-title">{operator.name}</h2>
          <p>{operator.role} · {operator.position}</p>
          <div><StatusBadge label="神经链路稳定" tone="success" /><StatusBadge label={operator.condition} tone="warning" /></div>
        </div>
        <div className="operator-clearance"><ShieldCheck size={19} weight="fill" aria-hidden /><span>档案权限</span><strong>精英 / 04</strong></div>
      </header>
      <ProvenanceLink sessionId={operator.sourceSessionId} messageId={operator.sourceMessageId} matchedLorebookEntryIds={operator.matchedLorebookEntryIds} idSuffix={`operator-${operator.id}`} />

      <div className="rosmontis-monitoring">
        <section className="vital-hero" aria-labelledby="operator-vitals-title">
          <div className="section-heading"><div><span className="panel-code">NEURAL MONITORING</span><h3 id="operator-vitals-title">精神与医疗监测</h3></div><Heartbeat size={20} aria-hidden /></div>
          <div className="vital-rings">
            <div className="vital-ring is-sanity" role="meter" aria-label="迷迭香理智稳定度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={operator.sanity ?? 0} style={{ '--ring-value': `${operator.sanity ?? 0}%` } as React.CSSProperties}><span>理智稳定度</span><strong>{operator.sanity}%</strong><small>稳定区间</small></div>
            <div className="vital-ring is-stress" role="meter" aria-label="迷迭香精神负荷" aria-valuemin={0} aria-valuemax={100} aria-valuenow={operator.stress} style={{ '--ring-value': `${operator.stress}%` } as React.CSSProperties}><span>精神负荷</span><strong>{operator.stress} / 100</strong><small>较 10 分钟前 +6</small></div>
          </div>
          <div className="stress-trend">
            <div><span><Waveform size={15} aria-hidden />负荷趋势 / 10 MIN</span><strong>缓慢上升</strong></div>
            <svg viewBox="0 0 420 74" role="img" aria-label={`精神负荷在十分钟内由 31 上升至 ${operator.stress}`}>
              <path className="trend-area" d="M0 65 L45 62 L90 59 L135 60 L180 48 L225 51 L270 39 L315 35 L365 21 L420 17 L420 74 L0 74 Z" />
              <path className="trend-line" d="M0 65 L45 62 L90 59 L135 60 L180 48 L225 51 L270 39 L315 35 L365 21 L420 17" />
              <circle cx="420" cy="17" r="4" />
            </svg>
          </div>
          <div className="medical-note"><FirstAidKit size={20} aria-hidden /><div><strong>医疗备注 / 03:27</strong><p>意识重叠维持在轻度区间。若精神负荷超过 70，应立即中止深层路径拓建并执行回收协议。</p></div></div>
        </section>

        <section className="rpg-attributes" aria-labelledby="rpg-attributes-title">
          <div className="section-heading"><div><span className="panel-code">TRPG ATTRIBUTES / D20</span><h3 id="rpg-attributes-title">跑团属性</h3></div><Brain size={20} aria-hidden /></div>
          <div className="attribute-grid">
            {attributes.map((attribute, index) => (
              <div key={attribute.label} className={index === 1 ? 'is-highlighted' : ''}>
                <span>{String(index + 1).padStart(2, '0')} / {attribute.label}</span>
                <strong>{attribute.value}</strong>
                <small>{attribute.modifier ? `修正 +${attribute.modifier}` : '无修正'}</small>
                <i style={{ transform: `scaleX(${attribute.value / 20})` }} />
              </div>
            ))}
          </div>
          <div className="operator-traits">
            <span className="panel-code">ACTIVE TRAITS / 03</span>
            <ul>{operator.traits.map((trait) => <li key={trait}><Sparkle size={14} weight="fill" aria-hidden />{trait}</li>)}</ul>
          </div>
        </section>
      </div>

      <div className="rosmontis-capabilities">
        <section><h3><Lightning size={17} aria-hidden />源石技艺与能力</h3><ul>{operator.abilities.map((ability, index) => <li key={ability}><span>{String(index + 1).padStart(2, '0')}</span>{ability}<small>{index === 0 ? '当前可用' : index === 1 ? '消耗 2 AP' : '战术压制'}</small></li>)}</ul></section>
        <section><h3><Hexagon size={17} aria-hidden />战术装备</h3><ul>{operator.equipment.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span>{item}<small>{index === 0 ? '在线' : '已校准'}</small></li>)}</ul></section>
        <section className="temporary-state"><h3><Brain size={17} aria-hidden />本局临时特征</h3><p>{operator.temporaryFeatures[0]}</p><Meter id="operators-overlap-stability" label="意识重叠稳定度" value={64} tone="warning" status="雨声会触发额外检定" /></section>
      </div>
    </article>
  );
}
