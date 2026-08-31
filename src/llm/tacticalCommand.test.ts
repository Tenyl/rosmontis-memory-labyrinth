import { describe, expect, test } from 'vitest';
import { createEncounter } from '../game/encounters';
import { createRun } from '../game/run';
import type { MazeNode } from '../game/types';
import { executeTacticalCommand } from './tacticalCommand';

function combatState() {
  const state = createRun({
    seed: 'TACTICAL-COMMAND', mode: 'preset', progression: { firstClear: false, completedRuns: 0 }, llmEnabled: false,
  });
  const node: MazeNode = { ...state.maze.nodes[0], type: 'combat', hiddenType: null, revealed: true };
  const withNode = { ...state, maze: { ...state.maze, nodes: [node, ...state.maze.nodes.slice(1)] } };
  return createEncounter({ ...withNode, pendingEncounter: null }, node);
}

describe('atomic tactical command execution', () => {
  test('executes a legal two-action plan through the real encounter reducer', () => {
    const before = combatState();
    const result = executeTacticalCommand(before, {
      version: 1, actionIds: ['sword:watch', 'sword:breach'], explanation: '防御后破壁。',
    });

    expect(result.accepted).toBe(true);
    expect(result.state.rosmontis.actionPoints).toBe(1);
    expect(result.state.pendingEncounter).toMatchObject({ kind: 'combat', enemyIntegrity: 50 });
    expect(result.events.filter((event) => event.type === 'greatsword.used')).toHaveLength(2);
  });

  test.each([
    ['cooldown', ['sword:breach', 'sword:breach']],
    ['insufficient AP', ['sword:watch', 'sword:breach', 'sword:watch']],
    ['illegal target', ['sword:resonance']],
  ])('rejects %s without partial mutation', (_name, actionIds) => {
    const before = combatState();
    const result = executeTacticalCommand(before, {
      version: 1, actionIds: actionIds as any, explanation: '试算。',
    });

    expect(result.accepted).toBe(false);
    expect(result.state).toBe(before);
    expect(result.events).toEqual([]);
  });
});
