import type { GameStore } from './gameStore';

export const selectSession = (state: GameStore) => state.session;
export const selectNarrative = (state: GameStore) => state.narrative;
export const selectMemoryMap = (state: GameStore) => state.memoryMap;
export const selectOperators = (state: GameStore) => state.operators;
export const selectArchive = (state: GameStore) => state.archive;
export const selectActionLog = (state: GameStore) => state.actionLog;
export const selectUi = (state: GameStore) => state.ui;
export const selectUnreadArchiveCount = (state: GameStore) =>
  state.archive.records.filter((record) => record.unread).length;
export const selectRosmontis = (state: GameStore) => state.operators.byId.rosmontis;
