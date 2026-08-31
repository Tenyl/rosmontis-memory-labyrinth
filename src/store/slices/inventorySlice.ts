import type { RoguelikeState } from '../../game/types';
import type { GameDataState } from '../../types/game';

export type InventorySlice = Pick<GameDataState, 'memoryInventory' | 'memoryCompendium'>;

export function createInventorySlice(state: RoguelikeState): InventorySlice {
  return {
    memoryInventory: {
      ...state.memoryInventory,
      fragments: state.memoryInventory.fragments.map((fragment) => ({ ...fragment, tags: [...fragment.tags] })),
      coreFragments: state.memoryInventory.coreFragments.map((fragment) => ({ ...fragment, tags: [...fragment.tags] })),
      pendingFragment: state.memoryInventory.pendingFragment
        ? { ...state.memoryInventory.pendingFragment, tags: [...state.memoryInventory.pendingFragment.tags] }
        : null,
    },
    memoryCompendium: [],
  };
}
