import type { GameStore } from './gameStore';

export const selectSession = (state: GameStore) => state.session;
export const selectNarrative = (state: GameStore) => state.narrative;
export const selectOperators = (state: GameStore) => state.operators;
export const selectUi = (state: GameStore) => state.ui;
export const selectRosmontis = (state: GameStore) => state.operators.byId.rosmontis;
