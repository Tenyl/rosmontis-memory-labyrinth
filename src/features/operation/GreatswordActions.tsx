import { Eye, ShieldChevron, Sword, Waveform } from '@phosphor-icons/react';
import { GREATSWORD_CONFIG } from '../../game/greatswords';
import { getOverloadBand } from '../../game/overload';
import type {
  GreatswordAction,
  GreatswordCombatState,
  GreatswordId,
  MazeNodeType,
  RuleEvent,
} from '../../game/types';

interface GreatswordActionsProps {
  rosmontis: GreatswordCombatState;
  currentNodeType: MazeNodeType;
  ruleLog: RuleEvent[];
  onUse: (action: GreatswordAction) => void;
}

const SWORD_PRESENTATION: Record<GreatswordId, {
  name: string;
  action: string;
  description: string;
}> = {
  breach: { name: '立柱 / 破壁', action: '破甲粉碎', description: '以质量投射粉碎护甲与认知障碍。' },
  watch: { name: '门扉 / 守望', action: '实体屏障', description: '展开实体屏障，吸收伤害并保护稳定性。' },
  perception: { name: '探针 / 认知', action: '神经扫描', description: '揭示未知节点并洞察敌方弱点。' },
  resonance: { name: '哀鸣 / 共鸣', action: '全域共振', description: '稳定深层核心并净化失控的情绪回声。' },
};

const NODE_TYPE_LABELS: Record<MazeNodeType, string> = {
  combat: '战斗',
  'emergency-combat': '紧急作战',
  safehouse: '休息处 / 安全屋',
  shop: '商店',
  encounter: '不期而遇 / 奇境',
  dilemma: '命运抉择',
  unknown: '未知',
  boss: 'Boss 房',
};

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
) {
  const config = GREATSWORD_CONFIG[swordId];
  const currentCooldown = rosmontis.greatswords[swordId].cooldown;
  if (currentCooldown > 0) return `仍需冷却 ${currentCooldown} 回合`;
  if (!config.nodeTypes.includes(currentNodeType)) return `仅可用于${config.nodeTypes.map((type) => NODE_TYPE_LABELS[type]).join('、')}`;
  if (swordId === 'perception' && getOverloadBand(rosmontis.overload) === 'berserk') return '暴走时无法维持精细的神经扫描';
  if (rosmontis.actionPoints < config.actionPointCost) return '行动点不足';
  return null;
}

export function GreatswordActions({
  rosmontis,
  currentNodeType,
  ruleLog,
  onUse,
}: GreatswordActionsProps) {
  const latestEvent = [...ruleLog].reverse().find((event) => event.type === 'greatsword.used');

  return (
    <section className="greatsword-actions" aria-labelledby="greatsword-actions-title">
      <header className="greatsword-actions-header">
        <div>
          <span>OFFLINE TACTICAL PRESET / {NODE_TYPE_LABELS[currentNodeType]}</span>
          <h2 id="greatsword-actions-title">四柄巨剑战术</h2>
        </div>
        <p>{rosmontis.actionPoints} AP 可用 · 当前过载 {rosmontis.overload}%</p>
      </header>

      <div className="greatsword-action-grid">
        {SWORD_IDS.map((swordId) => {
          const config = GREATSWORD_CONFIG[swordId];
          const presentation = SWORD_PRESENTATION[swordId];
          const disabledReason = getDisabledReason(swordId, rosmontis, currentNodeType);
          return (
            <button
              id={`btn-greatsword-${swordId}`}
              key={swordId}
              type="button"
              className={`greatsword-action-card is-${swordId}`}
              aria-label={`${presentation.name} · ${presentation.action}`}
              aria-describedby={`greatsword-${swordId}-availability`}
              disabled={disabledReason !== null}
              onClick={() => onUse({ swordId, target: config.target, nodeType: currentNodeType })}
            >
              <span className="greatsword-card-icon"><SwordIcon swordId={swordId} /></span>
              <span className="greatsword-card-heading">
                <strong>{presentation.name}</strong>
                <small>{presentation.action}</small>
              </span>
              <span className="greatsword-card-description">{presentation.description}</span>
              <span className="greatsword-card-costs">
                <b>{config.actionPointCost} AP</b>
                <b>冷却 {config.cooldown}</b>
                <b>过载 +{config.overloadDelta}%</b>
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
          ? `${SWORD_PRESENTATION[latestEvent.swordId].name}已执行 · -${latestEvent.actionPointCost} AP · +${latestEvent.overloadDelta}% 过载 · 冷却 ${latestEvent.cooldown}`
          : '等待指挥者选择离线战术。'}
      </p>
    </section>
  );
}
