import type { GameDataState, PendingDiaryDraft } from '../../types/game';

export type DiarySlice = Pick<GameDataState, 'pendingDiaryDrafts'>;

export function createDiarySlice(drafts: readonly PendingDiaryDraft[] = []): DiarySlice {
  return {
    pendingDiaryDrafts: drafts.map((draft) => ({ ...draft })),
  };
}
