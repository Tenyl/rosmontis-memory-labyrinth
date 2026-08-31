import { validateMaze } from '../game/maze';
import { createRun } from '../game/run';
import { inferLegacyFragmentKind } from '../game/fragmentCatalog';
import { getBossDefinition } from '../game/bosses';
import type { MazeGraph } from '../game/types';
import { restoreLlmDirectorState } from '../llm/directorState';
import type { GameDataState } from '../types/game';

const roguelikeKeys = [
  'run',
  'maze',
  'rosmontis',
  'memoryInventory',
  'progression',
  'ruleLog',
  'randomState',
  'economy',
  'modules',
  'explorationCharges',
  'routeEffects',
  'pendingEncounter',
] as const;

export function migrateGameState(persisted: unknown, current: GameDataState): GameDataState {
  if (!isRecord(persisted)) return current;
  const persistedUi = isRecord(persisted.ui) ? persisted.ui : {};
  const legacyMap = isRecord(persisted.memoryMap) ? persisted.memoryMap : null;
  const mazeViewMode = legacyMap?.viewMode === 'list' || legacyMap?.viewMode === 'graph'
    ? legacyMap.viewMode
    : persistedUi.mazeViewMode === 'list' || persistedUi.mazeViewMode === 'graph'
      ? persistedUi.mazeViewMode
      : current.ui.mazeViewMode;
  const merged: GameDataState = {
    run: (persisted.run ?? current.run) as GameDataState['run'],
    maze: (persisted.maze ?? current.maze) as GameDataState['maze'],
    rosmontis: (persisted.rosmontis ?? current.rosmontis) as GameDataState['rosmontis'],
    memoryInventory: (persisted.memoryInventory ?? current.memoryInventory) as GameDataState['memoryInventory'],
    progression: (persisted.progression ?? current.progression) as GameDataState['progression'],
    ruleLog: (persisted.ruleLog ?? current.ruleLog) as GameDataState['ruleLog'],
    randomState: (persisted.randomState ?? current.randomState) as GameDataState['randomState'],
    economy: current.economy,
    modules: current.modules,
    explorationCharges: current.explorationCharges,
    routeEffects: current.routeEffects,
    pendingEncounter: current.pendingEncounter,
    llmDirector: current.llmDirector,
    memoryCompendium: current.memoryCompendium,
    runHistory: current.runHistory,
    pendingDiaryDrafts: current.pendingDiaryDrafts,
    session: isRecord(persisted.session)
      ? { ...current.session, ...persisted.session }
      : current.session,
    narrative: isRecord(persisted.narrative)
      ? { ...current.narrative, ...persisted.narrative }
      : current.narrative,
    operators: current.operators,
    tavernProjection: isRecord(persisted.tavernProjection)
      ? { ...current.tavernProjection, ...persisted.tavernProjection }
      : current.tavernProjection,
    ui: {
      activeDialog: typeof persistedUi.activeDialog === 'string' || persistedUi.activeDialog === null
        ? persistedUi.activeDialog
        : current.ui.activeDialog,
      notifications: Array.isArray(persistedUi.notifications)
        ? persistedUi.notifications
        : current.ui.notifications,
      migrationNotice: persistedUi.migrationNotice === 'three-to-five-floors'
        ? 'three-to-five-floors'
        : current.ui.migrationNotice,
      mazeViewMode,
      preferences: {
        ...current.ui.preferences,
        ...(isRecord(persistedUi.preferences) ? persistedUi.preferences : {}),
      },
    },
  };
  merged.memoryCompendium = Array.isArray(persisted.memoryCompendium)
    ? persisted.memoryCompendium
    : current.memoryCompendium;
  merged.runHistory = Array.isArray(persisted.runHistory)
    ? persisted.runHistory
    : current.runHistory;
  merged.pendingDiaryDrafts = Array.isArray(persisted.pendingDiaryDrafts)
    ? persisted.pendingDiaryDrafts
    : current.pendingDiaryDrafts;
  merged.economy = isRecord(persisted.economy)
    && typeof persisted.economy.echoes === 'number'
    && typeof persisted.economy.scoutPoints === 'number'
    && Array.isArray(persisted.economy.shopPurchases)
    ? {
        echoes: persisted.economy.echoes,
        scoutPoints: persisted.economy.scoutPoints,
        shopPurchases: persisted.economy.shopPurchases,
      }
    : current.economy;
  merged.modules = Array.isArray(persisted.modules) ? persisted.modules : current.modules;
  merged.explorationCharges = isRecord(persisted.explorationCharges)
    ? { ...current.explorationCharges, ...persisted.explorationCharges }
    : current.explorationCharges;
  merged.routeEffects = isRecord(persisted.routeEffects)
    ? { ...current.routeEffects, ...persisted.routeEffects }
    : current.routeEffects;
  merged.pendingEncounter = Object.hasOwn(persisted, 'pendingEncounter')
    && (persisted.pendingEncounter === null || isRecord(persisted.pendingEncounter))
    ? persisted.pendingEncounter
    : null;

  const savedProgression = readProgression(persisted, current);
  if (isThreeFloorSave(persisted)) {
    const persistedRun = persisted.run as Record<string, unknown>;
    const seed = typeof persistedRun.seed === 'string' ? persistedRun.seed : current.run.seed;
    const requestedMode = persistedRun.mode;
    const mode = (requestedMode === 'endless' || requestedMode === 'novel') && savedProgression.firstClear
      ? requestedMode
      : 'preset';
    const rebuilt = createRun({
      seed,
      mode,
      progression: savedProgression,
      llmEnabled: mode === 'novel',
    });
    for (const key of roguelikeKeys) {
      (merged as unknown as Record<string, unknown>)[key] = key === 'ruleLog'
        ? []
        : rebuilt[key as keyof typeof rebuilt];
    }
    merged.progression = savedProgression;
    merged.ui = { ...merged.ui, migrationNotice: 'three-to-five-floors' };
  } else if (!hasValidRoguelikeState(persisted)) {
    for (const key of roguelikeKeys) {
      (merged as unknown as Record<string, unknown>)[key] = current[key];
    }
    merged.progression = savedProgression;
  }
  merged.run = normalizeRunContent(merged.run);

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
  merged.llmDirector = restoreLlmDirectorState(persisted.llmDirector, merged.run.id);
  if (merged.pendingEncounter?.kind === 'boss') {
    const legacyBoss = merged.pendingEncounter as typeof merged.pendingEncounter & { bossKind?: import('../game/bosses').BossKind };
    merged.pendingEncounter = {
      ...legacyBoss,
      bossKind: legacyBoss.bossKind ?? getBossDefinition(merged.run.floor).kind,
      phase: legacyBoss.phase === 'stability' && merged.run.floor >= 5 ? 'reconciliation' : legacyBoss.phase,
    };
  }
  merged.memoryInventory = {
    ...merged.memoryInventory,
    fragments: merged.memoryInventory.fragments.map(normalizeFragment),
    coreFragments: merged.memoryInventory.coreFragments.map(normalizeFragment),
    pendingFragment: merged.memoryInventory.pendingFragment
      ? normalizeFragment(merged.memoryInventory.pendingFragment)
      : null,
  };
  merged.memoryCompendium = merged.memoryCompendium.map((entry) => ({
    ...entry,
    kind: entry.kind === 'core' || entry.kind === 'emotion' || entry.kind === 'pain' || entry.kind === 'skill'
      ? entry.kind
      : inferLegacyFragmentKind(entry),
  }));
  return merged;
}

function normalizeRunContent(run: GameDataState['run']): GameDataState['run'] {
  const candidate = run as GameDataState['run'] & Record<string, unknown>;
  const binding = (isRecord(candidate.aiBinding) ? candidate.aiBinding : {}) as Record<string, unknown>;
  return {
    ...run,
    contentMode: candidate.contentMode === 'ai-director' ? 'ai-director' : 'local',
    narrativeStyle: candidate.narrativeStyle === 'novel' ? 'novel' : 'tactical',
    aiFailurePolicy: candidate.aiFailurePolicy === 'auto-fallback' || candidate.aiFailurePolicy === 'pause'
      ? candidate.aiFailurePolicy
      : 'ask',
    aiBinding: {
      chatId: typeof binding.chatId === 'string' ? binding.chatId : null,
      characterId: typeof binding.characterId === 'string' ? binding.characterId : null,
      personaId: typeof binding.personaId === 'string' ? binding.personaId : null,
      presetId: typeof binding.presetId === 'string' ? binding.presetId : null,
      lorebookIds: Array.isArray(binding.lorebookIds)
        ? binding.lorebookIds.filter((id: unknown): id is string => typeof id === 'string')
        : [],
    },
  };
}

function normalizeFragment<T extends { kind: unknown; tags: string[] }>(fragment: T) {
  return {
    ...fragment,
    kind: fragment.kind === 'core' || fragment.kind === 'emotion' || fragment.kind === 'pain' || fragment.kind === 'skill'
      ? fragment.kind
      : inferLegacyFragmentKind(fragment),
  } as T & { kind: 'emotion' | 'pain' | 'skill' | 'core' };
}

function readProgression(persisted: Record<string, unknown>, current: GameDataState) {
  return isRecord(persisted.progression)
    && typeof persisted.progression.firstClear === 'boolean'
    && typeof persisted.progression.completedRuns === 'number'
    ? {
        firstClear: persisted.progression.firstClear,
        completedRuns: persisted.progression.completedRuns,
      }
    : current.progression;
}

function isThreeFloorSave(value: Record<string, unknown>) {
  if (!isRecord(value.run) || !isRecord(value.maze)) return false;
  if (typeof value.run.maxFloor === 'number' && value.run.maxFloor < 5) return true;
  return Array.isArray(value.maze.nodes) && value.maze.nodes.some((node) => (
    isRecord(node) && (node.type === 'rest' || node.type === 'wonder')
  ));
}

function hasValidRoguelikeState(value: Record<string, unknown>) {
  if (!isRecord(value.run) || !isRecord(value.maze) || !isRecord(value.rosmontis)) return false;
  if (!isRecord(value.memoryInventory) || !isRecord(value.progression) || !isRecord(value.randomState)) return false;
  if (!Array.isArray(value.ruleLog)) return false;
  const run = value.run;
  const maze = value.maze;
  if (typeof run.currentNodeId !== 'string' || typeof run.mode !== 'string') return false;
  if (typeof run.maxFloor !== 'number') return false;
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
