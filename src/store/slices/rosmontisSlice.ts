import type { RoguelikeState } from '../../game/types';
import type { GameDataState } from '../../types/game';

export type RosmontisSlice = Pick<GameDataState, 'rosmontis'>;

export function createRosmontisSlice(state: RoguelikeState): RosmontisSlice {
  return {
    rosmontis: {
      ...state.rosmontis,
      greatswords: {
        breach: { ...state.rosmontis.greatswords.breach },
        watch: { ...state.rosmontis.greatswords.watch },
        perception: { ...state.rosmontis.greatswords.perception },
        resonance: { ...state.rosmontis.greatswords.resonance },
      },
    },
  };
}
