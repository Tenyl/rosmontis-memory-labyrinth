import {
  DB_VERSION,
  exportAllData,
  importAllData,
  type FullBackup,
} from './database';
import type { AppSettings } from './types';

export interface TavernBackup extends Omit<FullBackup, 'settings'> {
  kind: 'rhodes-tavern-backup';
  settings: AppSettings;
}

function sanitizeSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    api: {
      ...settings.api,
      apiKey: '',
      secondary: settings.api.secondary
        ? { ...settings.api.secondary, apiKey: '' }
        : undefined,
    },
  };
}

export async function exportTavernBackup(): Promise<TavernBackup> {
  const full = await exportAllData();
  const settings = full.settings[0];
  if (!settings) throw new Error('当前浏览器中没有可导出的酒馆设置');

  return {
    kind: 'rhodes-tavern-backup',
    version: DB_VERSION,
    exportedAt: full.exportedAt,
    lorebooks: full.lorebooks,
    presets: full.presets,
    settings: sanitizeSettings(settings),
    chats: full.chats,
    characters: full.characters,
    personas: full.personas,
    diaryEntries: full.diaryEntries,
  };
}

export async function importTavernBackup(input: unknown): Promise<void> {
  const backup = parseTavernBackup(input);

  await importAllData({
    version: backup.version,
    exportedAt: backup.exportedAt,
    lorebooks: backup.lorebooks,
    presets: backup.presets,
    settings: [sanitizeSettings(backup.settings)],
    chats: backup.chats,
    characters: backup.characters,
    personas: backup.personas,
    diaryEntries: backup.diaryEntries,
  });
}

export function parseTavernBackup(input: unknown): TavernBackup {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('备份格式无效：需要对象');
  }

  const backup = input as Partial<TavernBackup>;
  if (backup.kind !== 'rhodes-tavern-backup' || ![4, DB_VERSION].includes(backup.version ?? -1) || !backup.settings) {
    throw new Error(`备份版本不受支持：需要版本 4 或 ${DB_VERSION}`);
  }
  if (
    !Array.isArray(backup.lorebooks) ||
    !Array.isArray(backup.presets) ||
    !Array.isArray(backup.chats) ||
    !Array.isArray(backup.characters) ||
    !Array.isArray(backup.personas) ||
    (backup.version === DB_VERSION && !Array.isArray(backup.diaryEntries))
  ) {
    throw new Error('备份内容不完整');
  }

  return {
    kind: 'rhodes-tavern-backup',
    version: DB_VERSION,
    exportedAt: backup.exportedAt ?? Date.now(),
    lorebooks: backup.lorebooks,
    presets: backup.presets,
    settings: sanitizeSettings(backup.settings),
    chats: backup.chats,
    characters: backup.characters,
    personas: backup.personas,
    diaryEntries: backup.diaryEntries ?? [],
  };
}
