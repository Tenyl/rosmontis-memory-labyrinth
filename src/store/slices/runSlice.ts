import type { RoguelikeState } from '../../game/types';
import type { GameDataState } from '../../types/game';

export type RunSlice = Pick<GameDataState, 'run' | 'progression' | 'ruleLog' | 'runHistory'>;

export function createRunSlice(state: RoguelikeState): RunSlice {
  return {
    run: { ...state.run },
    progression: { ...state.progression },
    ruleLog: [],
    runHistory: [],
  };
}
