import type { GreatswordCombatState, ProgressionState, RunState } from '../../game/types';
import { RunStatusBar } from '../operation/RunStatusBar';

interface GameHudProps {
  run: RunState;
  rosmontis: GreatswordCombatState;
  progression: ProgressionState;
  echoes: number;
  scoutPoints: number;
  moduleCount: number;
}

export function GameHud(props: GameHudProps) {
  return (
    <RunStatusBar
      run={props.run}
      rosmontis={props.rosmontis}
      progression={props.progression}
      echoes={props.echoes}
      scoutPoints={props.scoutPoints}
      moduleCount={props.moduleCount}
    />
  );
}
