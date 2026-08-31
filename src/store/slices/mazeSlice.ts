import type { RoguelikeState } from '../../game/types';
import type { GameDataState } from '../../types/game';

export type MazeSlice = Pick<
  GameDataState,
  'maze' | 'randomState' | 'economy' | 'modules' | 'explorationCharges' | 'routeEffects' | 'pendingEncounter'
>;

export function createMazeSlice(state: RoguelikeState): MazeSlice {
  return {
    maze: {
      ...state.maze,
      nodes: state.maze.nodes.map((node) => ({ ...node, modifiers: [...node.modifiers] })),
      edges: state.maze.edges.map((edge) => ({ ...edge })),
    },
    randomState: { ...state.randomState },
    economy: { ...state.economy, shopPurchases: [...state.economy.shopPurchases] },
    modules: [...state.modules],
    explorationCharges: { ...state.explorationCharges },
    routeEffects: { ...state.routeEffects },
    pendingEncounter: state.pendingEncounter ? structuredClone(state.pendingEncounter) : null,
  };
}
