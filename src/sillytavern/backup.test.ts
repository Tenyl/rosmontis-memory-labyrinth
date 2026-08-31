import { afterEach, describe, expect, it } from 'vitest';
import { exportTavernBackup, parseTavernBackup } from './backup';
import { clearAllData, initializeDatabase, saveSettings } from './database';
import { saveDiaryEntry } from '../diary/repository';
import { DEFAULT_SETTINGS } from './types';

afterEach(async () => {
  await clearAllData();
});

describe('tavern backup', () => {
  it('imports a V4 backup with an empty diary collection', () => {
    const backup = parseTavernBackup({
      kind: 'rhodes-tavern-backup', version: 4, exportedAt: 1,
      lorebooks: [], presets: [], settings: DEFAULT_SETTINGS, chats: [], characters: [], personas: [],
    });
    expect(backup.version).toBe(6);
    expect(backup.diaryEntries).toEqual([]);
  });

  it('omits primary and secondary API keys from a normal backup', async () => {
    await initializeDatabase();
    await saveSettings({
      ...DEFAULT_SETTINGS,
      api: {
        ...DEFAULT_SETTINGS.api,
        apiKey: 'sk-primary-private',
        secondary: {
          enabled: true,
          baseUrl: 'https://secondary.example/v1',
          apiKey: 'sk-secondary-private',
          model: 'summary-model',
        },
      },
    });
    await saveDiaryEntry({
      id: 'diary-backup', triggerKey: 'floor-completed:backup:1', title: '被保存的一页',
      body: '我把这一页交给博士。', source: 'local', createdAt: '2026-08-31T00:00:00.000Z',
      runId: 'run-backup', floor: 1, illustrationAssetId: 'diaryIllustration', doctorNote: '',
      updatedAt: '2026-08-31T00:00:00.000Z',
    });

    const backup = await exportTavernBackup();
    const serialized = JSON.stringify(backup);

    expect(serialized).not.toContain('sk-primary-private');
    expect(serialized).not.toContain('sk-secondary-private');
    expect(backup.settings.api.apiKey).toBe('');
    expect(backup.settings.api.secondary?.apiKey).toBe('');
    expect(backup.diaryEntries).toEqual([expect.objectContaining({ id: 'diary-backup' })]);
  });
});
