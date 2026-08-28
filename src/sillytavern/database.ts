/**
 * IndexedDB Database Layer
 */

import Dexie, { Table } from 'dexie';
import type { Lorebook, ChatPreset, AppSettings, ChatSession, CharacterCard, Persona } from './types';
import { DEFAULT_SETTINGS } from './types';

const DB_NAME = 'SillyTavernWebDB';
export const DB_VERSION = 4;

class AppDatabase extends Dexie {
  lorebooks!: Table<Lorebook>;
  presets!: Table<ChatPreset>;
  settings!: Table<AppSettings>;
  chats!: Table<ChatSession>;
  characters!: Table<CharacterCard>;
  personas!: Table<Persona>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    });
    this.version(2).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    });
    this.version(3).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    }).upgrade(async tx => {
      const settings = await tx.table('settings').toCollection().toArray();
      for (const s of settings) {
        if (s.uiMode === undefined) s.uiMode = 'game';
        if (s.customTags === undefined) s.customTags = ['maintext', 'option', 'sum', 'vars', 'thinking', 'think'];
        if (s.thinkingDisplay === undefined) s.thinkingDisplay = 'fold';
        if (s.formatPromptTemplate === undefined) s.formatPromptTemplate = '';
        if (s.api && s.api.secondary === undefined) {
          s.api.secondary = { enabled: false, baseUrl: '', apiKey: '', model: '' };
        }
        await tx.table('settings').put(s);
      }
    });
    this.version(4).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt, parentChatId',
      characters: 'id, name, updatedAt',
      personas: 'id, name, updatedAt',
    }).upgrade(async tx => {
      const settings = await tx.table('settings').toCollection().toArray();
      for (const item of settings) {
        if (item.activeCharacterId === undefined) item.activeCharacterId = null;
        if (item.activePersonaId === undefined) item.activePersonaId = null;
        if (item.activeChatId === undefined) item.activeChatId = null;
        await tx.table('settings').put(item);
      }
    });
  }
}

let dbInstance: AppDatabase | null = null;

export function getDatabase(): AppDatabase {
  if (!dbInstance) {
    dbInstance = new AppDatabase();
  }
  return dbInstance;
}

export async function initializeDatabase(): Promise<void> {
  const db = getDatabase();

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.put({ ...DEFAULT_SETTINGS, key: 'settings' });
  }

  const { seedDefaultTavernContent } = await import('./default-content');
  await seedDefaultTavernContent();
}

export async function clearAllData(): Promise<void> {
  const db = getDatabase();
  await db.delete();
  dbInstance = null;
}

export interface FullBackup {
  version: number;
  exportedAt: number;
  lorebooks: Lorebook[];
  presets: ChatPreset[];
  settings: AppSettings[];
  chats: ChatSession[];
  characters: CharacterCard[];
  personas: Persona[];
}

export async function exportAllData(): Promise<FullBackup> {
  const db = getDatabase();
  const [lorebooks, presets, settings, chats, characters, personas] = await Promise.all([
    db.lorebooks.toArray(),
    db.presets.toArray(),
    db.settings.toArray(),
    db.chats.toArray(),
    db.characters.toArray(),
    db.personas.toArray(),
  ]);
  return {
    version: DB_VERSION,
    exportedAt: Date.now(),
    lorebooks,
    presets,
    settings,
    chats,
    characters,
    personas,
  };
}

export async function importAllData(backup: FullBackup): Promise<void> {
  if (!backup || typeof backup !== 'object') {
    throw new Error('备份格式无效');
  }
  const db = getDatabase();
  await db.transaction('rw', [db.lorebooks, db.presets, db.settings, db.chats, db.characters, db.personas], async () => {
    await db.lorebooks.clear();
    await db.presets.clear();
    await db.settings.clear();
    await db.chats.clear();
    await db.characters.clear();
    await db.personas.clear();
    if (Array.isArray(backup.lorebooks)) await db.lorebooks.bulkPut(backup.lorebooks);
    if (Array.isArray(backup.presets)) await db.presets.bulkPut(backup.presets);
    if (Array.isArray(backup.settings)) await db.settings.bulkPut(backup.settings);
    if (Array.isArray(backup.chats)) await db.chats.bulkPut(backup.chats);
    if (Array.isArray(backup.characters)) await db.characters.bulkPut(backup.characters);
    if (Array.isArray(backup.personas)) await db.personas.bulkPut(backup.personas);
  });
}

export async function getLorebooks(): Promise<Lorebook[]> {
  return getDatabase().lorebooks.toArray();
}

export async function saveLorebook(lorebook: Lorebook): Promise<string> {
  await getDatabase().lorebooks.put(lorebook);
  return lorebook.id;
}

export async function deleteLorebook(id: string): Promise<void> {
  await getDatabase().lorebooks.delete(id);
}

export async function getPresets(): Promise<ChatPreset[]> {
  return getDatabase().presets.toArray();
}

export async function savePreset(preset: ChatPreset): Promise<string> {
  await getDatabase().presets.put(preset);
  return preset.id;
}

export async function deletePreset(id: string): Promise<void> {
  await getDatabase().presets.delete(id);
}

export async function getSettings(): Promise<AppSettings | undefined> {
  const all = await getDatabase().settings.toArray();
  return all[0];
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await getDatabase().settings.put({ ...settings, key: 'settings' });
}

export async function getChats(): Promise<ChatSession[]> {
  return getDatabase().chats.toArray();
}

export async function saveChat(chat: ChatSession): Promise<string> {
  await getDatabase().chats.put(chat);
  return chat.id;
}

export async function deleteChat(id: string): Promise<void> {
  await getDatabase().chats.delete(id);
}

export async function setVariables(chatId: string, variables: Record<string, any>): Promise<void> {
  const db = getDatabase();
  const chat = await db.chats.get(chatId);
  if (!chat) return;
  chat.variables = variables;
  chat.updatedAt = Date.now();
  await db.chats.put(chat);
}

export async function getCharacters(): Promise<CharacterCard[]> {
  return getDatabase().characters.orderBy('name').toArray();
}

export async function saveCharacter(character: CharacterCard): Promise<string> {
  await getDatabase().characters.put(character);
  return character.id;
}

export async function deleteCharacter(id: string): Promise<void> {
  await getDatabase().characters.delete(id);
}

export async function getPersonas(): Promise<Persona[]> {
  return getDatabase().personas.orderBy('name').toArray();
}

export async function savePersona(persona: Persona): Promise<string> {
  await getDatabase().personas.put(persona);
  return persona.id;
}

export async function deletePersona(id: string): Promise<void> {
  await getDatabase().personas.delete(id);
}
