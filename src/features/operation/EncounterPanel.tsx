import {
  ArrowRight,
  Crosshair,
  BriefcaseMedical as FirstAid,
  CircleHelp as Question,
  Skull,
  Sparkles as Sparkle,
  Store as Storefront,
} from 'lucide-react';
import { resolveImageAsset } from '../../assets/assetRegistry';
import { GREATSWORD_CONFIG } from '../../game/greatswords';
import { getModule } from '../../game/modules';
import { NODE_TYPE_NAMES } from '../../game/terminology';
import type { EncounterAction, GreatswordId, MemoryInventory, ModuleId, PendingEncounter } from '../../game/types';
import { BossEncounter } from './BossEncounter';

interface EncounterPanelProps {
  encounter: PendingEncounter | null;
  inventory: MemoryInventory;
  echoes: number;
  modules: ModuleId[];
  resonanceActive: boolean;
  onResolve: (choiceId: string) => void;
  onAction: (action: EncounterAction) => void;
  onSellFragment: (fragmentId: string) => void;
  onAdvanceFloor: () => void;
  canAdvanceFloor: boolean;
  actionPoints?: number;
}

const ENCOUNTER_COPY = {
  combat: { code: 'COMBAT', title: '残响实体压制', description: '以本地规则逐轮削减结构完整度。' },
  safehouse: { code: 'SAFEHOUSE', title: '思维温室休整', description: '从三项恢复方案中选择一项，本层仅可执行一次。' },
  shop: { code: 'SHOP', title: '认知补给终端', description: '使用记忆残响购买模块，或出售普通记忆碎片。' },
  encounter: { code: 'ENCOUNTER', title: '奇境异常观测', description: '记忆碎片与巨剑准备状态会解锁额外处理方式。' },
  unknown: { code: 'UNKNOWN', title: '未知信号接触', description: '结果已由本地种子预先生成，进入后才会揭示。' },
  boss: { code: 'CORE', title: '记忆核心对峙', description: '先击穿防护，再用共鸣重建核心稳定。' },
} as const;

function EncounterIcon({ kind }: { kind: PendingEncounter['kind'] }) {
  const props = { size: 24, 'aria-hidden': true } as const;
  if (kind === 'combat') return <Crosshair {...props} />;
  if (kind === 'safehouse') return <FirstAid {...props} />;
  if (kind === 'shop') return <Storefront {...props} />;
  if (kind === 'encounter') return <Sparkle {...props} />;
  if (kind === 'boss') return <Skull {...props} />;
  return <Question {...props} />;
}

function choiceRequirement(
  encounter: PendingEncounter,
  choice: PendingEncounter['choices'][number],
  inventory: MemoryInventory,
  resonanceActive: boolean,
) {
  if (encounter.kind !== 'encounter') return null;
  if (choice.requiredTag && !inventory.fragments.some((fragment) => fragment.tags.includes(choice.requiredTag!))) {
    return `需要“${choice.requiredTag}”碎片`;
  }
  if (choice.requiresResonance && !resonanceActive) return '需要预备共鸣';
  return null;
}

export function EncounterPanel({
  encounter,
  inventory,
  echoes,
  modules,
  resonanceActive,
  onResolve,
  onAction,
  onSellFragment,
  onAdvanceFloor,
  canAdvanceFloor,
  actionPoints = 0,
}: EncounterPanelProps) {
  if (!encounter) {
    return (
      <section className="encounter-panel is-empty" aria-labelledby="encounter-title">
        <header><div><span>ENCOUNTER / STANDBY</span><h2 id="encounter-title">等待节点同步</h2></div></header>
        <p className="encounter-empty-copy">前往记忆地图选择路径，节点规则将在进入后载入。</p>
      </section>
    );
  }

  const copy = ENCOUNTER_COPY[encounter.kind];
  return (
    <section
      className={`encounter-panel is-${encounter.kind}`}
      aria-labelledby="encounter-title"
      onDragOver={(event) => { if (event.dataTransfer.types.includes('application/x-rosmontis-sword')) event.preventDefault(); }}
      onDrop={(event) => {
        const swordId = event.dataTransfer.getData('application/x-rosmontis-sword');
        if (isGreatswordId(swordId)) { event.preventDefault(); onAction({ type: 'play-sword', swordId }); }
      }}
    >
      <header>
        <span className="encounter-kind-icon"><EncounterIcon kind={encounter.kind} /></span>
        <div>
          <span>{copy.code} / {encounter.nodeId}</span>
          <h2 id="encounter-title">{copy.title}</h2>
          <p>{copy.description}</p>
        </div>
        <strong className={encounter.resolved ? 'is-complete' : ''}>{encounter.resolved ? '结算完成' : '等待指令'}</strong>
      </header>

      {encounter.kind === 'combat' && (
        <><div className="encounter-telemetry" aria-label="战斗状态">
          <span>第 {encounter.round} / {encounter.maxRounds} 轮</span>
          <strong>结构完整度 {encounter.enemyIntegrity} / 80</strong>
          <span>胜利残响 +{encounter.rewardEchoes}</span>
        </div><p className="encounter-card-guidance">请点击上方【{GREATSWORD_CONFIG.breach.name}】或【{GREATSWORD_CONFIG.watch.name}】战术卡，也可以把可用卡片拖到本面板执行。</p></>
      )}

      {encounter.kind === 'shop' && (
        <div className="encounter-shop">
          <div className="encounter-balance"><span>当前记忆残响</span><strong>{echoes}</strong></div>
          <div className="shop-offer-grid">
            {encounter.offers.map((offer) => {
              const module = getModule(offer.moduleId);
              const purchased = modules.includes(offer.moduleId);
              const unavailable = purchased || echoes < offer.price;
              return (
                <article key={offer.id} className="shop-offer-card">
                  <img src={resolveImageAsset('moduleCard')} alt="认知模块资源占位图" />
                  <div>
                    <span>{module.rarity === 'rare' ? 'RARE' : 'STANDARD'}</span>
                    <h3>{module.name}</h3>
                    <p>{module.description}</p>
                  </div>
                  <button
                    id={`btn-buy-${offer.id}`}
                    type="button"
                    disabled={unavailable || encounter.resolved}
                    onClick={() => onResolve(`buy:${offer.id}`)}
                    aria-label={`购买${module.name}，价格 ${offer.price} 记忆残响${purchased ? '，已装载' : echoes < offer.price ? '，残响不足' : ''}`}
                  >
                    {purchased ? '已装载' : `购买 · ${offer.price}`}
                  </button>
                </article>
              );
            })}
          </div>
          {inventory.fragments.length > 0 && (
            <div className="fragment-sale-list">
              <span>可出售普通碎片 / 每枚 +6 残响</span>
              <div>
                {inventory.fragments.map((fragment) => (
                  <button
                    id={`btn-sell-${fragment.id}`}
                    key={fragment.id}
                    type="button"
                    disabled={encounter.resolved}
                    onClick={() => onSellFragment(fragment.id)}
                    aria-label={`出售${fragment.name}，获得 6 记忆残响`}
                  >
                    {fragment.name}<strong>+6</strong>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {encounter.kind === 'unknown' && (
        <div className="encounter-unknown-state">
          <strong>{encounter.resolved ? `真实类型：${NODE_TYPE_NAMES[encounter.hiddenType]}` : '节点内容处于加密状态'}</strong>
          <span>{encounter.glitch ? '高过载干扰生效' : '信号干扰处于可控范围'}</span>
          {encounter.directEntryBonus > 0 && <span>直接进入补偿 +{encounter.directEntryBonus} 残响</span>}
        </div>
      )}

      {encounter.kind === 'boss' && (
        <BossEncounter encounter={encounter} actionPoints={actionPoints} onAction={onAction} />
      )}

      {!['shop', 'combat', 'boss'].includes(encounter.kind) && !encounter.resolved && (
        <div className="encounter-choice-grid">
          {encounter.choices.map((choice) => {
            const requirement = choiceRequirement(encounter, choice, inventory, resonanceActive);
            const phaseLocked = encounter.kind === 'boss'
              && ((choice.id === 'boss-breach' && encounter.phase !== 'shield')
                || (choice.id === 'boss-resonate' && encounter.phase !== 'stability'));
            return (
              <button
                id={`btn-encounter-${choice.id}`}
                key={choice.id}
                type="button"
                disabled={Boolean(requirement) || phaseLocked}
                onClick={() => onResolve(choice.id)}
                aria-label={`${choice.label}：${choice.description}${requirement ? `；${requirement}` : phaseLocked ? '；当前阶段不可用' : ''}`}
              >
                <strong>{choice.label}</strong>
                <span>{choice.description}</span>
                {(requirement || phaseLocked) && <small>{requirement ?? '当前阶段不可用'}</small>}
              </button>
            );
          })}
        </div>
      )}

      {encounter.kind === 'shop' && !encounter.resolved && (
        <button id="btn-leave-encounter-shop" className="encounter-leave-button" type="button" onClick={() => onResolve('leave-shop')}>离开认知黑市</button>
      )}

      {(encounter.kind === 'combat' || encounter.kind === 'boss') && !encounter.resolved && (
        <button id="btn-recover-tactical-turn" className="encounter-leave-button" type="button" onClick={() => onAction({ type: 'recover' })}>调整呼吸 · 恢复 4 AP / 冷却推进 1</button>
      )}

      {encounter.resolved && (
        <footer className="encounter-complete">
          <span>LOCAL RULE SETTLED / 节点状态已写入</span>
          {canAdvanceFloor && (
            <button id="btn-advance-run-floor" type="button" onClick={onAdvanceFloor}>
              进入下一层记忆迷宫 <ArrowRight size={17} aria-hidden />
            </button>
          )}
        </footer>
      )}
    </section>
  );
}

function isGreatswordId(value: string): value is GreatswordId {
  return value === 'breach' || value === 'watch' || value === 'perception' || value === 'resonance';
}
