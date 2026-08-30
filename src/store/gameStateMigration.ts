import { validateMaze } from '../game/maze';
import type { MazeGraph } from '../game/types';
import type { GameDataState } from '../types/game';

const roguelikeKeys = [
  'run',
  'maze',
  'rosmontis',
  'memoryInventory',
  'progression',
  'ruleLog',
  'randomState',
] as const;

export function migrateGameState(persisted: unknown, current: GameDataState): GameDataState {
  if (!isRecord(persisted)) return current;
  const merged = {
    ...current,
    ...persisted,
    ui: {
      ...current.ui,
      ...(isRecord(persisted.ui) ? persisted.ui : {}),
      preferences: {
        ...current.ui.preferences,
        ...(isRecord(persisted.ui) && isRecord(persisted.ui.preferences) ? persisted.ui.preferences : {}),
      },
    },
  } as GameDataState;

  if (!hasValidRoguelikeState(persisted)) {
    for (const key of roguelikeKeys) {
      (merged as unknown as Record<string, unknown>)[key] = current[key];
    }
  }

  const persistedOperators = isRecord(persisted.operators) && isRecord(persisted.operators.byId)
    ? persisted.operators.byId
    : {};
  const candidate = persistedOperators.rosmontis;
  merged.operators = {
    byId: {
      rosmontis: isRecord(candidate)
        ? { ...current.operators.byId.rosmontis, ...candidate }
        : current.operators.byId.rosmontis,
    },
    squadOrder: ['rosmontis'],
    formation: '单人认知潜入',
  };
  if (isRecord(persisted.narrative) && persisted.narrative.inputMode === '询问队员') {
    merged.narrative = { ...merged.narrative, inputMode: '状态询问' };
  }
  return merged;
}

function hasValidRoguelikeState(value: Record<string, unknown>) {
  if (!isRecord(value.run) || !isRecord(value.maze) || !isRecord(value.rosmontis)) return false;
  if (!isRecord(value.memoryInventory) || !isRecord(value.progression) || !isRecord(value.randomState)) return false;
  if (!Array.isArray(value.ruleLog)) return false;
  const run = value.run;
  const maze = value.maze;
  if (typeof run.currentNodeId !== 'string' || typeof run.mode !== 'string') return false;
  if (!Array.isArray(maze.nodes) || !Array.isArray(maze.edges)) return false;
  if (!maze.nodes.some((node) => isRecord(node) && node.id === run.currentNodeId)) return false;
  if (!Array.isArray(value.memoryInventory.fragments) || !Array.isArray(value.memoryInventory.coreFragments)) return false;
  if (typeof value.progression.firstClear !== 'boolean' || typeof value.progression.completedRuns !== 'number') return false;
  if (typeof value.randomState.cursor !== 'number' || typeof value.randomState.draws !== 'number') return false;
  try {
    return validateMaze(maze as unknown as MazeGraph).valid;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
