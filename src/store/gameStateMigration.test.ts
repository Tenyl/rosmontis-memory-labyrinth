import { describe, expect, test } from 'vitest';
import { buildDemoState } from '../data/demoData';
import { migrateGameState } from './gameStateMigration';

function withoutRoguelikeSlices() {
  const legacy = structuredClone(buildDemoState()) as unknown as Record<string, unknown>;
  for (const key of ['run', 'maze', 'rosmontis', 'memoryInventory', 'progression', 'ruleLog', 'randomState']) {
    delete legacy[key];
  }
  return legacy;
}

describe('versioned game state migration', () => {
  test('migrates legacy prototype state while preserving preferences and Tavern projections', () => {
    const current = buildDemoState();
    const legacy = withoutRoguelikeSlices() as any;
    legacy.ui.preferences.density = 'compact';
    legacy.tavernProjection = {
      activeSessionId: 'chat-legacy',
      sessions: { 'chat-legacy': { processedMessageIds: [], events: [] } },
    };
    legacy.operators.byId.companion = { ...legacy.operators.byId.rosmontis, id: 'companion' };
    legacy.operators.squadOrder.push('companion');

    const migrated = migrateGameState(legacy, current);

    expect(migrated.run).toEqual(current.run);
    expect(migrated.maze).toEqual(current.maze);
    expect(migrated.ui.preferences.density).toBe('compact');
    expect(migrated.tavernProjection.activeSessionId).toBe('chat-legacy');
    expect(Object.keys(migrated.operators.byId)).toEqual(['rosmontis']);
  });

  test('migrates phase-one single-protagonist state into a fresh preset Run', () => {
    const current = buildDemoState();
    const phaseOne = withoutRoguelikeSlices();

    const migrated = migrateGameState(phaseOne, current);

    expect(migrated.run.mode).toBe('preset');
    expect(migrated.run.phase).toBe('exploring');
    expect(migrated.run.currentNodeId).toBe(migrated.maze.startNodeId);
    expect(migrated.memoryInventory.pendingFragment).toBeNull();
  });

  test('replaces malformed roguelike slices without erasing unrelated persisted state', () => {
    const current = buildDemoState();
    const malformed = structuredClone(current) as any;
    malformed.run.currentNodeId = 'missing-node';
    malformed.maze.nodes = [];
    malformed.ui.preferences.fontSize = 'xlarge';
    malformed.tavernProjection.activeSessionId = 'chat-safe';

    const migrated = migrateGameState(malformed, current);

    expect(migrated.run).toEqual(current.run);
    expect(migrated.maze).toEqual(current.maze);
    expect(migrated.ui.preferences.fontSize).toBe('xlarge');
    expect(migrated.tavernProjection.activeSessionId).toBe('chat-safe');
  });

  test('preserves an already-current valid Run', () => {
    const current = buildDemoState();
    const persisted = structuredClone(current);
    persisted.run.turn = 9;
    persisted.progression = { firstClear: true, completedRuns: 3 };

    const migrated = migrateGameState(persisted, current);

    expect(migrated.run.turn).toBe(9);
    expect(migrated.progression).toEqual({ firstClear: true, completedRuns: 3 });
    expect(migrated.maze).toEqual(persisted.maze);
  });

  test('migrates the retired squad inquiry mode to a single-protagonist status inquiry', () => {
    const current = buildDemoState();
    const persisted = structuredClone(current) as any;
    persisted.narrative.inputMode = '询问队员';

    const migrated = migrateGameState(persisted, current);

    expect(migrated.narrative.inputMode).toBe('状态询问');
  });

  test('adds director state to old saves and clears stale loading requests', () => {
    const current = buildDemoState();
    const missing = structuredClone(current) as any;
    delete missing.llmDirector;
    const stale = structuredClone(current) as any;
    stale.llmDirector.runId = 'old-run';
    stale.llmDirector.requests.event = {
      status: 'loading',
      token: 'old-run:event:node-a',
      errorCode: null,
    };

    const migratedMissing = migrateGameState(missing, current);
    const migratedStale = migrateGameState(stale, current);

    expect(migratedMissing.llmDirector.runId).toBe(migratedMissing.run.id);
    expect(migratedMissing.llmDirector.requests.event.status).toBe('idle');
    expect(migratedStale.llmDirector.runId).toBe(migratedStale.run.id);
    expect(migratedStale.llmDirector.requests.event).toEqual({ status: 'idle', token: null, errorCode: null });
  });
});
