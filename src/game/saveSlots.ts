import type { GameDataState } from '../types/game';

export type SaveSlotId = 'slot-1' | 'slot-2' | 'slot-3';

export interface SaveSlotSummary {
  floor: number;
  mode: GameDataState['run']['mode'];
  contentMode: GameDataState['run']['contentMode'];
  nodeId: string;
  sanity: number;
  overload: number;
  fragments: number;
  turns: number;
}

export interface SaveSnapshot {
  version: 10;
  savedAt: string;
  summary: SaveSlotSummary;
  state: GameDataState;
}

export interface SaveSlot {
  id: SaveSlotId;
  label: string;
  snapshot: SaveSnapshot | null;
}

const SAVE_KEY = 'rosmontis-run-save-slots';
const ACTIVE_KEY = 'rosmontis-active-save-slot';
const SLOT_IDS: SaveSlotId[] = ['slot-1', 'slot-2', 'slot-3'];

export function listSaveSlots(storage: Storage): SaveSlot[] {
  const snapshots = readSnapshots(storage);
  return SLOT_IDS.map((id, index) => ({ id, label: `存档槽 ${index + 1}`, snapshot: snapshots[id] ?? null }));
}

export function createSaveSlot(
  id: SaveSlotId,
  state: GameDataState,
  storage: Storage,
  savedAt = new Date().toISOString(),
): SaveSnapshot {
  const snapshot: SaveSnapshot = {
    version: 10,
    savedAt,
    summary: {
      floor: state.run.floor,
      mode: state.run.mode,
      contentMode: state.run.contentMode,
      nodeId: state.run.currentNodeId,
      sanity: state.rosmontis.sanity,
      overload: state.rosmontis.overload,
      fragments: state.memoryInventory.fragments.length + state.memoryInventory.coreFragments.length,
      turns: state.run.turn,
    },
    state,
  };
  storage.setItem(SAVE_KEY, JSON.stringify({ ...readSnapshots(storage), [id]: snapshot }));
  return snapshot;
}

export function loadSaveSlot(id: SaveSlotId, storage: Storage): SaveSnapshot | null {
  return readSnapshots(storage)[id] ?? null;
}

export function setActiveSaveSlotId(id: SaveSlotId, storage: Storage) {
  storage.setItem(ACTIVE_KEY, id);
}

export function getActiveSaveSlotId(storage: Storage): SaveSlotId | null {
  const value = storage.getItem(ACTIVE_KEY);
  return SLOT_IDS.includes(value as SaveSlotId) ? value as SaveSlotId : null;
}

export function clearSaveSlots(storage: Storage) {
  storage.removeItem(SAVE_KEY);
  storage.removeItem(ACTIVE_KEY);
}

function readSnapshots(storage: Storage): Partial<Record<SaveSlotId, SaveSnapshot>> {
  try {
    const value = JSON.parse(storage.getItem(SAVE_KEY) ?? '{}') as Partial<Record<SaveSlotId, SaveSnapshot>>;
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}
