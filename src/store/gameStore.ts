import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { buildDemoState } from '../data/demoData';
import type { ArchiveRecord, GameDataState } from '../types/game';

interface GameActions {
  setOperatorStress: (operatorId: string, stress: number) => void;
  addArchiveRecord: (record: ArchiveRecord) => void;
  resetDemoState: () => void;
}

export type GameStore = GameDataState & GameActions;

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      ...buildDemoState(),
      setOperatorStress: (operatorId, stress) =>
        set((state) => {
          const operator = state.operators.byId[operatorId];
          if (!operator) return state;

          return {
            operators: {
              ...state.operators,
              byId: {
                ...state.operators.byId,
                [operatorId]: { ...operator, stress },
              },
            },
          };
        }),
      addArchiveRecord: (record) =>
        set((state) => ({
          archive: {
            ...state.archive,
            records: state.archive.records.some((item) => item.id === record.id)
              ? state.archive.records
              : [...state.archive.records, { ...record, relatedIds: [...record.relatedIds] }],
          },
        })),
      resetDemoState: () => set(buildDemoState()),
    }),
    {
      name: 'rhodes-cognition-terminal-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,
        narrative: state.narrative,
        memoryMap: state.memoryMap,
        operators: state.operators,
        archive: state.archive,
        actionLog: state.actionLog,
        ui: { ...state.ui, activeDialog: null, notifications: [] },
      }),
    },
  ),
);
