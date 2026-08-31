export type GameScenePhase =
  | 'map'
  | 'entering-node'
  | 'node'
  | 'settling-node'
  | 'returning-map';

export interface GameSceneCamera {
  x: number;
  y: number;
  scale: number;
}

export interface GameSceneState {
  phase: GameScenePhase;
  targetNodeId: string | null;
  transitionId: number;
  commitState: 'preview' | 'committed';
  camera: GameSceneCamera;
}

export type GameSceneAction =
  | { type: 'request-node'; nodeId: string }
  | { type: 'commit-node'; transitionId: number }
  | { type: 'open-node'; nodeId: string }
  | { type: 'settle-node' }
  | { type: 'request-map' }
  | { type: 'finish-return' }
  | { type: 'cancel-entry' }
  | { type: 'set-camera'; camera: GameSceneCamera };

export function createGameSceneState(): GameSceneState {
  return {
    phase: 'map',
    targetNodeId: null,
    transitionId: 0,
    commitState: 'preview',
    camera: { x: 0, y: 0, scale: 1 },
  };
}

export function restoreGameSceneState(
  encounter: { nodeId: string; resolved: boolean } | null,
): GameSceneState {
  const state = createGameSceneState();
  return encounter && !encounter.resolved
    ? gameSceneReducer(state, { type: 'open-node', nodeId: encounter.nodeId })
    : state;
}

export function gameSceneReducer(
  state: GameSceneState,
  action: GameSceneAction,
): GameSceneState {
  switch (action.type) {
    case 'request-node':
      return {
        ...state,
        phase: 'entering-node',
        targetNodeId: action.nodeId,
        transitionId: state.transitionId + 1,
        commitState: 'preview',
      };
    case 'commit-node':
      return state.phase === 'entering-node'
        && state.commitState === 'preview'
        && action.transitionId === state.transitionId
        ? { ...state, commitState: 'committed' }
        : state;
    case 'cancel-entry':
      return state.phase === 'entering-node' && state.commitState === 'preview'
        ? { ...state, phase: 'map', targetNodeId: null }
        : state;
    case 'open-node':
      return {
        ...state,
        phase: 'node',
        targetNodeId: action.nodeId,
        commitState: 'committed',
      };
    case 'settle-node':
      return state.phase === 'node' ? { ...state, phase: 'settling-node' } : state;
    case 'request-map':
      return state.phase === 'settling-node'
        ? { ...state, phase: 'returning-map' }
        : state;
    case 'finish-return':
      return state.phase === 'returning-map'
        ? { ...state, phase: 'map', targetNodeId: null, commitState: 'preview' }
        : state;
    case 'set-camera':
      return { ...state, camera: action.camera };
  }
}
