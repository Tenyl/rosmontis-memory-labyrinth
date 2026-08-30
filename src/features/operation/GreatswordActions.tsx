import { Eye, ShieldChevron, Sword, Waveform } from '@phosphor-icons/react';
import { GREATSWORD_CONFIG } from '../../game/greatswords';
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
  breach: { name: '破壁', action: '普通攻击', description: '以质量投射击穿残响实体的结构完整度。' },
  watch: { name: '守望', action: '巨剑护盾', description: '构筑稳定质量场，为迷迭香吸收下一次冲击。' },
  perception: { name: '感知', action: '战术感知', description: '读取空白断层的微弱神经信号并获得洞察。' },
  resonance: { name: '共鸣', action: '精神爆发', description: '让记忆碎片与核心共振，推进核心稳定进程。' },
};

const NODE_TYPE_LABELS: Record<MazeNodeType, string> = {
  combat: '战斗',
  rest: '休息处',
  shop: '商店',
  wonder: '奇境',
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
