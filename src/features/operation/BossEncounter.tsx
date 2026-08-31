import {
  HandHeart,
  Heart,
  Shield as ShieldChevron,
} from 'lucide-react';
import { resolveImageAsset } from '../../assets/assetRegistry';
import { getBossDefinition } from '../../game/bosses';
import type { EncounterAction, PendingEncounter } from '../../game/types';

interface BossEncounterProps {
  encounter: Extract<PendingEncounter, { kind: 'boss' }>;
  actionPoints: number;
  onAction: (action: EncounterAction) => void;
}

export function BossEncounter({ encounter, actionPoints, onAction }: BossEncounterProps) {
  const definition = encounter.bossKind === 'closed-heart'
    ? getBossDefinition(5)
    : encounter.bossKind === 'gatekeeper'
      ? getBossDefinition(1)
      : getBossDefinition(6);
  const reconciliation = encounter.phase === 'reconciliation' || encounter.phase === 'stability';

  return (
    <div className={`boss-encounter is-${reconciliation ? 'reconciliation' : 'shield'}${encounter.resolved ? ' is-resolved' : ''}`}>
      <img src={resolveImageAsset('bossNode')} alt="Boss 立绘资源占位图" />
      <div className="boss-encounter-copy">
        <span>{definition.kind === 'closed-heart' ? 'FINAL COGNITION / CLOSED HEART' : 'FLOOR GATEKEEPER'}</span>
        <h3>{reconciliation ? '阶段二：拥抱与共鸣' : definition.phases === 2 ? '阶段一：破除心防' : definition.shieldLabel}</h3>
        <p>{reconciliation
          ? '伤害型指令已锁定。请使用【哀鸣 / 共鸣】战术卡，或在她愿意回应时握住手，让和解逐步抵达 100。'
          : '使用【立柱 / 破壁】战术卡击碎防护；守门残响清除后即可进入下一层。'}</p>
      </div>
      <div className="boss-phase-meters">
        <div><span><ShieldChevron size={15} aria-hidden />心防完整度</span><strong>{encounter.enemyIntegrity} / 80</strong><i style={{ width: `${Math.min(100, encounter.enemyIntegrity / 80 * 100)}%` }} /></div>
        {definition.phases === 2 ? <div><span><Heart size={15} aria-hidden />共鸣度</span><strong>共鸣度 {encounter.coreStability} / 100</strong><i style={{ width: `${encounter.coreStability}%` }} /></div> : null}
      </div>
      {reconciliation && !encounter.resolved ? (
        <div className="boss-comfort-actions" aria-label="陪伴交互">
          <button id="btn-boss-touch-forehead" type="button" disabled={actionPoints < 1} onClick={() => onAction({ type: 'comfort', gesture: 'touch-forehead' })}><HandHeart size={17} aria-hidden /><span><strong>轻触额头</strong><small>{actionPoints < 1 ? '行动点不足' : '1 AP · 共鸣 +10'}</small></span></button>
          <button id="btn-boss-hold-hand" type="button" disabled={actionPoints < 2} onClick={() => onAction({ type: 'comfort', gesture: 'hold-hand' })}><HandHeart size={17} aria-hidden /><span><strong>握住手</strong><small>{actionPoints < 2 ? '行动点不足' : '2 AP · 共鸣 +20'}</small></span></button>
        </div>
      ) : null}
      {encounter.glitch ? <p className="boss-glitch-warning">高过载正在干扰她辨认博士的声音。</p> : null}
    </div>
  );
}
