import type { BossPhase } from '../../game/bosses';
import type { EncounterAction, GreatswordCombatState } from '../../game/types';
import { CompanionInteractionBar } from '../operation/CompanionInteractionBar';
import { RosmontisQuotePanel } from '../operation/RosmontisQuotePanel';

interface RosmontisPresenceProps {
  rosmontis: GreatswordCombatState;
  bossPhase: BossPhase | null;
  onAction: (action: EncounterAction) => void;
}

export function RosmontisPresence(props: RosmontisPresenceProps) {
  return (
    <section id="rosmontis-presence" className="rosmontis-presence" role="region" aria-label="迷迭香陪伴交互">
      <RosmontisQuotePanel />
      <CompanionInteractionBar
        rosmontis={props.rosmontis}
        bossPhase={props.bossPhase}
        onAction={props.onAction}
      />
    </section>
  );
}
