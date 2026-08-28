import { afterEach, describe, expect, it } from 'vitest';
import { exportTavernBackup } from './backup';
import { clearAllData, initializeDatabase, saveSettings } from './database';
import { DEFAULT_SETTINGS } from './types';

afterEach(async () => {
  await clearAllData();
});

describe('tavern backup', () => {
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

    const backup = await exportTavernBackup();
    const serialized = JSON.stringify(backup);

    expect(serialized).not.toContain('sk-primary-private');
    expect(serialized).not.toContain('sk-secondary-private');
    expect(backup.settings.api.apiKey).toBe('');
    expect(backup.settings.api.secondary?.apiKey).toBe('');
  });
});
