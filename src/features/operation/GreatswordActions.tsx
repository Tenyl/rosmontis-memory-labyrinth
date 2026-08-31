import {
  Eye,
  Shield as ShieldChevron,
  Sword,
  AudioWaveform as Waveform,
} from 'lucide-react';
import { GREATSWORD_CONFIG } from '../../game/greatswords';
import { getOverloadBand } from '../../game/overload';
import { NODE_TYPE_NAMES } from '../../game/terminology';
import type {
  GreatswordCombatState,
  GreatswordId,
  EncounterAction,
  ExplorationCharges,
  MazeNodeType,
  PendingEncounter,
  RuleEvent,
} from '../../game/types';

interface GreatswordActionsProps {
  rosmontis: GreatswordCombatState;
  currentNodeType: MazeNodeType;
  encounter: PendingEncounter | null;
  explorationCharges: ExplorationCharges;
  ruleLog: RuleEvent[];
  onAction: (action: EncounterAction) => void;
}

const SWORD_IDS: GreatswordId[] = ['breach', 'watch', 'perception', 'resonance'];

function SwordIcon({ swordId }: { swordId: GreatswordId }) {
  if (swordId === 'breach') return <Sword size={22} aria-hidden />;
  if (swordId === 'watch') return <ShieldChevron size={22} aria-hidden />;
  if (swordId === 'perception') return <Eye size={22} aria-hidden />;
  return <Waveform size={22} aria-hidden />;
}

function getDisabledReason(
  swordId: GreatswordId,
  rosmontis: GreatswordCombatState,
  currentNodeType: MazeNodeType,
  encounter: PendingEncounter | null,
) {
  const config = GREATSWORD_CONFIG[swordId];
  const currentCooldown = rosmontis.greatswords[swordId].cooldown;
  if (currentCooldown > 0) return `仍需冷却 ${currentCooldown} 回合`;
  if (!config.nodeTypes.includes(currentNodeType)) return `仅可用于${config.nodeTypes.map((type) => NODE_TYPE_NAMES[type]).join('、')}`;
  if (encounter?.kind === 'boss') {
    const reconciliation = encounter.phase === 'reconciliation' || encounter.phase === 'stability';
    if (reconciliation && swordId !== 'resonance') return `她已经放下心防；此阶段仅允许${GREATSWORD_CONFIG.resonance.name}与安抚`;
    if (!reconciliation && swordId !== 'breach') return `必须先使用${GREATSWORD_CONFIG.breach.name}解除心防`;
  }
  if (swordId === 'perception' && getOverloadBand(rosmontis.overload) === 'berserk') return '暴走时无法维持精细的神经扫描';
  if (rosmontis.actionPoints < config.actionPointCost) return '行动点不足';
  return null;
}

export function GreatswordActions({
  rosmontis,
  currentNodeType,
  encounter,
  explorationCharges,
  ruleLog,
  onAction,
}: GreatswordActionsProps) {
  const latestEvent = [...ruleLog].reverse().find((event) => event.type === 'greatsword.used');
  const swordSequence = ruleLog
    .filter((event): event is Extract<RuleEvent, { type: 'greatsword.used' }> => event.type === 'greatsword.used')
    .slice(-2)
    .map((event) => event.swordId);
  const nextCombo = swordSequence.at(-1) === 'perception'
    ? { swordId: 'breach' as const, label: '精准贯穿' }
    : swordSequence.at(-1) === 'watch'
      ? { swordId: 'resonance' as const, label: '念力震爆' }
      : swordSequence.at(-1) === 'breach'
        ? { swordId: 'watch' as const, label: '阵线压制' }
        : null;

  return (
    <section className="greatsword-actions" aria-labelledby="greatsword-actions-title">
      <header className="greatsword-actions-header">
        <div>
          <span>OFFLINE TACTICAL PRESET / {NODE_TYPE_NAMES[currentNodeType]}</span>
          <h2 id="greatsword-actions-title">四柄巨剑战术</h2>
        </div>
        <p>{rosmontis.actionPoints} AP 可用 · 当前过载 {rosmontis.overload}%</p>
      </header>

      <div className="tactical-command-rail" aria-label="战术指令资源">
        <div className="ap-indicator" role="meter" aria-label={`行动点 ${rosmontis.actionPoints} / 4`} aria-valuemin={0} aria-valuemax={4} aria-valuenow={rosmontis.actionPoints}>
          <span>AP</span>
          {[0, 1, 2, 3].map((point) => <i key={point} className={point < rosmontis.actionPoints ? 'is-ready' : ''} />)}
          <strong>{rosmontis.actionPoints}/4</strong>
        </div>
        <div className="combo-prompt" aria-live="polite">
          {nextCombo
            ? <>连携就绪：点击 <strong>{GREATSWORD_CONFIG[nextCombo.swordId].name}</strong> 触发「{nextCombo.label}」</>
            : '释放第一柄巨剑，系统会高亮可衔接的战术。'}
        </div>
      </div>

      <div className={`greatsword-action-grid${getOverloadBand(rosmontis.overload) === 'berserk' ? ' is-berserk' : ''}`}>
        {SWORD_IDS.map((swordId) => {
          const config = GREATSWORD_CONFIG[swordId];
          const presentation = GREATSWORD_CONFIG[swordId];
          const disabledReason = getDisabledReason(swordId, rosmontis, currentNodeType, encounter);
          return (
            <button
              id={`btn-greatsword-${swordId}`}
              key={swordId}
              type="button"
              className={`greatsword-action-card is-${swordId}${nextCombo?.swordId === swordId ? ' is-combo-ready' : ''}`}
              aria-label={`${presentation.name} · ${presentation.tacticalRole}`}
              aria-describedby={`greatsword-${swordId}-availability`}
              disabled={disabledReason !== null}
              draggable={disabledReason === null}
              onDragStart={(event) => event.dataTransfer.setData('application/x-rosmontis-sword', swordId)}
              onClick={() => onAction({ type: 'play-sword', swordId })}
            >
              <span className="greatsword-card-icon"><SwordIcon swordId={swordId} /></span>
              <span className="greatsword-card-heading">
                <strong>{presentation.name}</strong>
                <small>{presentation.tacticalRole}</small>
              </span>
              <span className="greatsword-card-description">{presentation.description}</span>
              <span className="greatsword-card-costs">
                <b>{config.actionPointCost} AP</b>
                <b>冷却 {config.cooldown}</b>
                <b>过载 +{config.overloadDelta}%</b>
                <b>探索充能 {explorationCharges[swordId]}</b>
              </span>
              <span id={`greatsword-${swordId}-availability`} className="greatsword-card-availability">
                {disabledReason ?? '战术链路可执行'}
              </span>
            </button>
          );
        })}
      </div>

      <p className="greatsword-action-status" role="status" aria-live="polite">
        {latestEvent && latestEvent.type === 'greatsword.used'
          ? `${GREATSWORD_CONFIG[latestEvent.swordId].name}已执行 · -${latestEvent.actionPointCost} AP · +${latestEvent.overloadDelta}% 过载 · 冷却 ${latestEvent.cooldown}`
          : '等待指挥者选择离线战术。'}
      </p>
    </section>
  );
}
