import {
  HandHeart,
  Hand as HandPalm,
} from 'lucide-react';
import { useState } from 'react';
import { resolveAudioAsset } from '../../assets/assetRegistry';
import type { BossPhase } from '../../game/bosses';
import { getRosmontisMessage } from '../../game/rosmontisMessages';
import type { EncounterAction, GreatswordCombatState } from '../../game/types';

interface CompanionInteractionBarProps {
  rosmontis: GreatswordCombatState;
  bossPhase: BossPhase | null;
  onAction: (action: EncounterAction) => void;
}

export function CompanionInteractionBar({ rosmontis, bossPhase, onAction }: CompanionInteractionBarProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const audio = resolveAudioAsset('comfortSfx');
  const bossLocked = bossPhase === 'shield';
  const status = feedback ?? getRosmontisMessage({
    kind: 'status', sanity: rosmontis.sanity, overload: rosmontis.overload, bossPhase: bossPhase ?? undefined,
  });

  const comfort = (gesture: 'touch-forehead' | 'hold-hand') => {
    setFeedback(getRosmontisMessage({ kind: 'comfort', gesture, sanity: rosmontis.sanity, overload: rosmontis.overload, bossPhase: bossPhase ?? undefined }));
    onAction({ type: 'comfort', gesture });
  };

  return (
    <section className="companion-interaction-bar" aria-labelledby="companion-interaction-title">
      <div>
        <span>NEURAL TOUCH / COMPANION LINK</span>
        <h2 id="companion-interaction-title">神经触碰 / 陪伴交互</h2>
        <p className="companion-feedback" role="status" aria-live="polite">{status}</p>
      </div>
      <div className="companion-actions">
        <button id="btn-companion-touch-forehead" type="button" disabled={bossLocked || rosmontis.actionPoints < 1} aria-label="轻触额头，消耗 1 AP，降低 8% 过载" onClick={() => comfort('touch-forehead')}><HandPalm size={19} aria-hidden /><span><strong>轻触额头</strong><small>{bossLocked ? '先破除心防' : '1 AP · 过载 -8%'}</small></span></button>
        <button id="btn-companion-hold-hand" type="button" disabled={bossLocked || rosmontis.actionPoints < 2} aria-label="握住手，消耗 2 AP，降低 18% 过载" onClick={() => comfort('hold-hand')}><HandHeart size={19} aria-hidden /><span><strong>握住手</strong><small>{bossLocked ? '先破除心防' : '2 AP · 过载 -18%'}</small></span></button>
      </div>
      {audio ? <audio src={audio} preload="none" /> : null}
    </section>
  );
}
