import { afterEach, describe, expect, it } from 'vitest';
import { clearAllData, DB_VERSION, getDatabase } from '../sillytavern/database';
import { listDiaryEntries, saveDiaryEntry, updateDoctorNote } from './repository';
import type { DiaryEntry } from './types';
import Dexie from 'dexie';

afterEach(async () => {
  await clearAllData();
});

describe('Rosmontis diary repository', () => {
  it('upgrades a V4 database without removing existing tavern records', async () => {
    await clearAllData();
    const legacy = new Dexie('SillyTavernWebDB');
    legacy.version(4).stores({
      lorebooks: 'id, name, updatedAt', presets: 'id, name, updatedAt', settings: 'key',
      chats: 'id, name, updatedAt, parentChatId', characters: 'id, name, updatedAt', personas: 'id, name, updatedAt',
    });
    await legacy.open();
    await legacy.table('lorebooks').put({ id: 'legacy-lore', name: '保留的世界书', updatedAt: 1 });
    await legacy.table('presets').put({ id: 'legacy-preset', name: '保留的预设', updatedAt: 1 });
    await legacy.table('chats').put({ id: 'legacy-chat', name: '保留的会话', updatedAt: 1 });
    legacy.close();

    const database = getDatabase();
    await database.open();
    expect(await database.lorebooks.get('legacy-lore')).toBeTruthy();
    expect(await database.presets.get('legacy-preset')).toBeTruthy();
    expect(await database.chats.get('legacy-chat')).toBeTruthy();
    expect(database.tables.map((table) => table.name)).toContain('diaryEntries');
  });

  it('uses database V6 and persists entries with doctor notes', async () => {
    expect(DB_VERSION).toBe(6);
    expect(getDatabase().tables.map((table) => table.name)).toContain('diaryEntries');

    await saveDiaryEntry({
      id: 'diary-run-1-floor-1',
      triggerKey: 'floor-completed:run-1:1',
      title: '离开表层残响以后',
      body: '我听见博士在另一端叫我，所以我继续向前走。',
      source: 'local',
      createdAt: '2026-08-31T00:00:00.000Z',
      runId: 'run-1',
      floor: 1,
      illustrationAssetId: 'diaryIllustration',
      doctorNote: '',
      updatedAt: '2026-08-31T00:00:00.000Z',
    });
    await updateDoctorNote('diary-run-1-floor-1', '我会一直记得。');

    expect(await listDiaryEntries()).toEqual([
      expect.objectContaining({ id: 'diary-run-1-floor-1', doctorNote: '我会一直记得。' }),
    ]);
  });

  it('is idempotent by stable trigger key', async () => {
    const entry = {
      id: 'diary-run-1-boss-gate',
      triggerKey: 'boss-completed:run-1:gate',
      title: '门后面的风', body: '我把剑收回来了。', source: 'local' as const,
      createdAt: '2026-08-31T00:00:00.000Z', runId: 'run-1', floor: 1,
      illustrationAssetId: 'diaryIllustration', doctorNote: '', updatedAt: '2026-08-31T00:00:00.000Z',
    } satisfies DiaryEntry;
    await saveDiaryEntry(entry);
    await saveDiaryEntry({ ...entry, id: 'duplicate-id' });
    expect(await listDiaryEntries()).toHaveLength(1);
  });
});
