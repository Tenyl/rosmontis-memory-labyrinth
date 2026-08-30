import { applyModuleEffect } from './modules';
import type {
  ExplorationRuleState,
  GreatswordId,
} from './types';

export interface ExplorationAction {
  swordId: GreatswordId;
  nodeId?: string;
  edgeId?: string;
}

export interface ExplorationResolution {
  accepted: boolean;
  reason?: string;
  state: ExplorationRuleState;
}

function rejected(state: ExplorationRuleState, reason: string): ExplorationResolution {
  return { accepted: false, reason, state };
}

function consumeCharge(
  state: ExplorationRuleState,
  swordId: GreatswordId,
): ExplorationRuleState {
  return {
    ...state,
    explorationCharges: { ...state.explorationCharges, [swordId]: 0 },
  };
}

export function useExplorationPower(
  state: ExplorationRuleState,
  action: ExplorationAction,
): ExplorationResolution {
  if (state.explorationCharges[action.swordId] === 0) {
    return rejected(state, '该巨剑的本层探索充能已耗尽。');
  }

  if (action.swordId === 'perception') {
    const node = state.maze.nodes.find((item) => item.id === action.nodeId);
    if (!node || node.type !== 'unknown' || node.revealed || node.state !== 'reachable') {
      return rejected(state, '只能侦测一个可达且尚未揭示的未知节点。');
    }
    const charged = consumeCharge(state, action.swordId);
    return {
      accepted: true,
      state: {
        ...charged,
        maze: {
          ...state.maze,
          nodes: state.maze.nodes.map((item) => item.id === node.id
            ? { ...item, revealed: true }
            : item),
        },
      },
    };
  }

  if (action.swordId === 'breach') {
    const edge = state.maze.edges.find((item) => item.id === action.edgeId);
    if (!edge || !edge.locked || edge.sourceId !== state.currentNodeId) {
      return rejected(state, '只能开启一条从当前节点延伸的封锁路径。');
    }
    const charged = consumeCharge(state, action.swordId);
    return {
      accepted: true,
      state: {
        ...charged,
        maze: {
          ...state.maze,
          edges: state.maze.edges.map((item) => item.id === edge.id
            ? { ...item, locked: false }
            : item),
        },
      },
    };
  }

  if (action.swordId === 'watch') {
    const charged = consumeCharge(state, action.swordId);
    return {
      accepted: true,
      state: {
        ...charged,
        routeEffects: { ...state.routeEffects, nextNodeGuarded: true },
      },
    };
  }

  const charged = consumeCharge(state, action.swordId);
  return {
    accepted: true,
    state: {
      ...charged,
      routeEffects: { ...state.routeEffects, resonanceActive: true },
    },
  };
}

export function spendScoutPoint(
  state: ExplorationRuleState,
  nodeId: string,
): ExplorationResolution {
  const node = state.maze.nodes.find((item) => item.id === nodeId);
  if (!node || node.type !== 'unknown' || node.revealed || node.state !== 'reachable') {
    return rejected(state, '只能侦测一个可达且尚未揭示的未知节点。');
  }
  const canUseFreeScan = state.modules.includes('perception-array')
    && !state.routeEffects.freeScoutUsed;
  const cost = canUseFreeScan
    ? applyModuleEffect(state.modules, { type: 'scout-cost', value: 1 })
    : 1;
  if (state.economy.scoutPoints < cost) return rejected(state, '侦测点不足。');

  return {
    accepted: true,
    state: {
      ...state,
      economy: { ...state.economy, scoutPoints: state.economy.scoutPoints - cost },
      routeEffects: {
        ...state.routeEffects,
        freeScoutUsed: state.routeEffects.freeScoutUsed || canUseFreeScan,
      },
      maze: {
        ...state.maze,
        nodes: state.maze.nodes.map((item) => item.id === node.id
          ? { ...item, revealed: true }
          : item),
      },
    },
  };
}
