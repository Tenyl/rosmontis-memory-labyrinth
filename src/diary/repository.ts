import { getDatabase } from '../sillytavern/database';
import type { DiaryEntry } from './types';

export async function listDiaryEntries(): Promise<DiaryEntry[]> {
  return getDatabase().diaryEntries.orderBy('updatedAt').reverse().toArray();
}

export async function saveDiaryEntry(entry: DiaryEntry): Promise<string> {
  const database = getDatabase();
  const existing = await database.diaryEntries.where('triggerKey').equals(entry.triggerKey).first();
  const next = existing
    ? { ...entry, id: existing.id, doctorNote: existing.doctorNote, updatedAt: entry.updatedAt }
    : entry;
  await database.diaryEntries.put(next);
  return next.id;
}

export async function updateDoctorNote(id: string, doctorNote: string): Promise<void> {
  const database = getDatabase();
  const entry = await database.diaryEntries.get(id);
  if (!entry) throw new Error('手记条目不存在');
  await database.diaryEntries.put({ ...entry, doctorNote, updatedAt: new Date().toISOString() });
}

export async function persistDiaryDraft(draft: import('../game/types').DiaryDraft, runId: string, floor: number): Promise<string> {
  const now = draft.createdAt === 'pending-write' ? new Date().toISOString() : draft.createdAt;
  return saveDiaryEntry({
    ...draft,
    createdAt: now,
    runId: draft.runId ?? runId,
    floor: draft.floor ?? floor,
    illustrationAssetId: 'diaryIllustration',
    doctorNote: '',
    updatedAt: now,
  });
}
