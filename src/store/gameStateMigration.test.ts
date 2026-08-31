import { describe, expect, test } from 'vitest';
import { buildDemoState } from '../data/demoData';
import { createRun } from '../game/run';
import { migrateGameState } from './gameStateMigration';

function withoutRoguelikeSlices() {
  const legacy = structuredClone(buildDemoState()) as unknown as Record<string, unknown>;
  for (const key of ['run', 'maze', 'rosmontis', 'memoryInventory', 'progression', 'ruleLog', 'randomState']) {
    delete legacy[key];
  }
  return legacy;
}

describe('versioned game state migration', () => {
  test('adds local content defaults to legacy runs without changing gameplay state', () => {
    const current = buildDemoState();
    const persisted = structuredClone(current) as any;
    delete persisted.run.contentMode;
    delete persisted.run.narrativeStyle;
    delete persisted.run.aiFailurePolicy;
    delete persisted.run.aiBinding;
    persisted.run.turn = 13;

    const migrated = migrateGameState(persisted, current);

    expect(migrated.run).toMatchObject({
      turn: 13,
      contentMode: 'local',
      narrativeStyle: 'tactical',
      aiFailurePolicy: 'ask',
      aiBinding: {
        chatId: null,
        characterId: null,
        personaId: null,
        presetId: null,
        lorebookIds: [],
      },
    });
  });

  test('migrates V7 by dropping legacy domains while preserving the active Run', () => {
    const current = buildDemoState();
    const persisted = structuredClone(current) as unknown as Record<string, unknown>;
    persisted.memoryMap = { viewMode: 'list', nodes: [{ id: 'legacy' }], edges: [] };
    persisted.archive = { records: [{ id: 'legacy-archive' }], links: [] };
    persisted.actionLog = [{ id: 'legacy-log' }];
    (persisted.ui as Record<string, unknown>).sidebarCollapsed = true;

    const migrated = migrateGameState(persisted, current);

    expect(migrated.run.id).toBe(current.run.id);
    expect(migrated.maze).toEqual(current.maze);
    expect(migrated.ui.mazeViewMode).toBe('list');
    expect(migrated.ui).not.toHaveProperty('sidebarCollapsed');
    expect(migrated).not.toHaveProperty('memoryMap');
    expect(migrated).not.toHaveProperty('archive');
    expect(migrated).not.toHaveProperty('actionLog');
  });

  test('rebuilds a V5 three-floor Run as a five-floor Run with the same seed', () => {
    const current = buildDemoState();
    const previous = structuredClone(current) as any;
    previous.run.seed = 'LEGACY-V5-SEED';
    previous.run.id = 'run-legacy-v5';
    previous.run.maxFloor = 3;
    previous.run.turn = 17;
    previous.progression = { firstClear: true, completedRuns: 4 };
    previous.memoryCompendium = [{
      id: 'legacy-memory', name: '被保存的旧记忆', kind: 'standard', tags: ['旧档案'],
      discoveredRunId: 'run-legacy-v5', discoveries: 2,
    }];
    previous.runHistory = [{ id: 'legacy-history' }];
    previous.ui.preferences.density = 'compact';

    const migrated = migrateGameState(previous, current);

    expect(migrated.run).toMatchObject({ seed: 'LEGACY-V5-SEED', maxFloor: 5, floor: 1, turn: 1 });
    expect(migrated.run.currentNodeId).toBe(migrated.maze.startNodeId);
    expect(migrated.maze.nodes.find((node) => node.id === migrated.maze.startNodeId)?.type).toBe('safehouse');
    expect(migrated.ui).toMatchObject({ migrationNotice: 'three-to-five-floors' });
    expect(migrated.progression).toEqual({ firstClear: true, completedRuns: 4 });
    expect(migrated.memoryCompendium[0]?.id).toBe('legacy-memory');
    expect(migrated.memoryCompendium[0]?.kind).toBe('emotion');
    expect(migrated.runHistory[0]?.id).toBe('legacy-history');
    expect(migrated.ui.preferences.density).toBe('compact');
  });

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

  test('migrates a legacy fifth-floor boss into the closed-heart reconciliation phase', () => {
    const current = buildDemoState();
    const persisted = structuredClone(current) as any;
    const legacyRun = createRun({ seed: 'LEGACY-BOSS-FIVE', mode: 'preset', progression: current.progression, llmEnabled: false, floor: 5 });
    Object.assign(persisted, legacyRun);
    persisted.pendingEncounter = {
      kind: 'boss', nodeId: persisted.run.currentNodeId, resolved: false,
      phase: 'stability', enemyIntegrity: 0, coreStability: 25, glitch: false, choices: [],
    };

    const migrated = migrateGameState(persisted, current);
    expect(migrated.pendingEncounter).toMatchObject({
      kind: 'boss', bossKind: 'closed-heart', phase: 'reconciliation', coreStability: 25,
    });
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

  test('adds empty permanent compendium and Run history slices to version-three saves', () => {
    const current = buildDemoState();
    const previous = structuredClone(current) as any;
    delete previous.memoryCompendium;
    delete previous.runHistory;

    const migrated = migrateGameState(previous, current);

    expect(migrated.memoryCompendium).toEqual([]);
    expect(migrated.runHistory).toEqual([]);
  });

  test('adds integrated-run defaults to a legacy save while preserving progression and compendium', () => {
    const current = buildDemoState();
    const previous = structuredClone(current) as any;
    delete previous.economy;
    delete previous.modules;
    delete previous.explorationCharges;
    delete previous.routeEffects;
    delete previous.pendingEncounter;
    previous.progression = { firstClear: true, completedRuns: 4 };
    previous.memoryCompendium = [{
      id: 'legacy-memory',
      name: '旧记忆',
      kind: 'standard',
      tags: [],
      discoveredRunId: 'legacy-run',
      discoveries: 1,
    }];

    const migrated = migrateGameState(previous, current);

    expect(migrated.economy).toEqual({ echoes: 0, scoutPoints: 1, shopPurchases: [] });
    expect(migrated.modules).toEqual([]);
    expect(migrated.explorationCharges).toEqual({ breach: 1, watch: 1, perception: 1, resonance: 1 });
    expect(migrated.routeEffects).toMatchObject({ nextNodeGuarded: false, resonanceActive: false });
    expect(migrated.pendingEncounter).toBeNull();
    expect(migrated.progression).toEqual({ firstClear: true, completedRuns: 4 });
    expect(migrated.memoryCompendium[0]?.id).toBe('legacy-memory');
    expect(migrated.memoryCompendium[0]?.kind).toBe('emotion');
  });
});
