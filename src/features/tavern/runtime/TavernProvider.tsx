import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  DEFAULT_OPAQUE_TAGS,
  DEFAULT_SETTINGS,
  StreamTagParser,
  aggregateEvents,
  applyParsedToChat,
  assemblePrompt,
  deleteCharacter as deleteCharacterDb,
  deleteChat as deleteChatDb,
  deleteLorebook as deleteLorebookDb,
  deletePersona as deletePersonaDb,
  deletePreset as deletePresetDb,
  getCharacters,
  getChats,
  getLorebooks,
  getPersonas,
  getPresets,
  getSettings,
  initializeDatabase,
  saveCharacter,
  saveChat,
  saveLorebook,
  savePersona,
  savePreset,
  saveSettings,
  type AppSettings,
  type CharacterCard,
  type ChatMessage,
  type ChatPreset,
  type ChatSession,
  type Lorebook,
  type MatchedEntry,
  type ParsedTags,
  type ParserEvent,
  type Persona,
} from '../../../sillytavern';
import { LocalTavernTransport } from './local-tavern-transport';
import { OpenAiTavernTransport } from './openai-tavern-transport';
import type { TavernTransport } from './tavern-transport';

export type TavernRuntimeStatus =
  | 'booting'
  | 'ready'
  | 'assembling'
  | 'streaming'
  | 'paused'
  | 'complete'
  | 'interrupted'
  | 'failed';

export interface TavernStreamState {
  thinking: string;
  maintext: string;
  options: string[];
  sum: string;
  varsRaw: string;
  raw: string;
}

export interface TavernRuntimeValue {
  initialized: boolean;
  status: TavernRuntimeStatus;
  error: string | null;
  transportMode: TavernTransport['mode'];
  settings: AppSettings | null;
  chats: ChatSession[];
  characters: CharacterCard[];
  personas: Persona[];
  lorebooks: Lorebook[];
  presets: ChatPreset[];
  activeChat: ChatSession | null;
  activeCharacter: CharacterCard | null;
  activePersona: Persona | null;
  activePreset: ChatPreset | null;
  stream: TavernStreamState;
  matchedEntries: MatchedEntry[];
  reload: () => Promise<void>;
  createChat: (name: string) => Promise<string>;
  selectChat: (id: string) => Promise<void>;
  renameChat: (id: string, name: string) => Promise<void>;
  removeChat: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  retryLastTurn: () => Promise<void>;
  editAndRegenerate: (messageId: string, content: string) => Promise<void>;
  deleteMessagesFrom: (messageId: string) => Promise<void>;
  branchFromMessage: (messageId: string, name?: string) => Promise<string>;
  updateVariables: (variables: Record<string, unknown>) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  upsertCharacter: (character: CharacterCard) => Promise<void>;
  removeCharacter: (id: string) => Promise<void>;
  upsertPersona: (persona: Persona) => Promise<void>;
  removePersona: (id: string) => Promise<void>;
  upsertLorebook: (lorebook: Lorebook) => Promise<void>;
  removeLorebook: (id: string) => Promise<void>;
  upsertPreset: (preset: ChatPreset) => Promise<void>;
  removePreset: (id: string) => Promise<void>;
}

const EMPTY_STREAM: TavernStreamState = {
  thinking: '',
  maintext: '',
  options: [],
  sum: '',
  varsRaw: '',
  raw: '',
};

export const TavernContext = createContext<TavernRuntimeValue | null>(null);

interface TavernProviderProps extends PropsWithChildren {
  transport?: TavernTransport;
}

export function TavernProvider({ children, transport }: TavernProviderProps) {
  const [settings, setSettingsState] = useState<AppSettings | null>(null);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [characters, setCharacters] = useState<CharacterCard[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [lorebooks, setLorebooks] = useState<Lorebook[]>([]);
  const [presets, setPresets] = useState<ChatPreset[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [status, setStatus] = useState<TavernRuntimeStatus>('booting');
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<TavernStreamState>(EMPTY_STREAM);
  const [matchedEntries, setMatchedEntries] = useState<MatchedEntry[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const loadAll = useCallback(async () => {
    setStatus('booting');
    setError(null);
    await initializeDatabase();
    const [storedSettings, storedChats, storedCharacters, storedPersonas, storedLorebooks, storedPresets] = await Promise.all([
      getSettings(),
      getChats(),
      getCharacters(),
      getPersonas(),
      getLorebooks(),
      getPresets(),
    ]);
    const mergedSettings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...storedSettings,
      api: {
        ...DEFAULT_SETTINGS.api,
        ...storedSettings?.api,
        secondary: storedSettings?.api.secondary
          ? { ...storedSettings.api.secondary }
          : DEFAULT_SETTINGS.api.secondary,
      },
    };
    const activeChatExists = storedChats.some((chat) => chat.id === mergedSettings.activeChatId);
    if (!activeChatExists) {
      mergedSettings.activeChatId = [...storedChats].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? null;
      await saveSettings(mergedSettings);
    }
    setSettingsState(mergedSettings);
    setChats(storedChats);
    setCharacters(storedCharacters);
    setPersonas(storedPersonas);
    setLorebooks(storedLorebooks);
    setPresets(storedPresets);
    setInitialized(true);
    setStatus('ready');
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadAll().catch((loadError: unknown) => {
      if (cancelled) return;
      setError(loadError instanceof Error ? loadError.message : '酒馆数据初始化失败');
      setStatus('failed');
      setInitialized(true);
    });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [loadAll]);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === settings?.activeChatId) ?? null,
    [chats, settings?.activeChatId],
  );
  const activeCharacter = useMemo(
    () => characters.find((character) => character.id === settings?.activeCharacterId) ?? characters[0] ?? null,
    [characters, settings?.activeCharacterId],
  );
  const activePersona = useMemo(
    () => personas.find((persona) => persona.id === settings?.activePersonaId) ?? personas[0] ?? null,
    [personas, settings?.activePersonaId],
  );
  const activePreset = useMemo(
    () => presets.find((preset) => preset.id === activeChat?.presetId)
      ?? presets.find((preset) => preset.id === settings?.activePresetId)
      ?? presets[0]
      ?? null,
    [activeChat?.presetId, presets, settings?.activePresetId],
  );
  const selectedTransport = useMemo<TavernTransport>(() => {
    if (transport) return transport;
    return settings?.api.apiKey.trim() ? new OpenAiTavernTransport() : new LocalTavernTransport();
  }, [settings?.api.apiKey, transport]);

  const persistSettings = useCallback(async (next: AppSettings) => {
    await saveSettings(next);
    setSettingsState(next);
  }, []);

  const createChat = useCallback(async (name: string) => {
    if (!settings) throw new Error('酒馆设置尚未载入');
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('请输入会话名称');
    const now = Date.now();
    const chat: ChatSession = {
      id: crypto.randomUUID(),
      name: trimmedName,
      messages: [],
      characterName: activeCharacter?.name ?? settings.characterName,
      userName: activePersona?.name ?? settings.userName,
      characterId: activeCharacter?.id ?? settings.activeCharacterId,
      personaId: activePersona?.id ?? settings.activePersonaId,
      parentChatId: null,
      branchedFromMessageId: null,
      presetId: activePreset?.id ?? settings.activePresetId,
      lorebookIds: [...settings.activeLorebookIds],
      variables: { ...(activePersona?.variables ?? {}) },
      createdAt: now,
      updatedAt: now,
    };
    await saveChat(chat);
    await persistSettings({ ...settings, activeChatId: chat.id });
    setChats((current) => [...current, chat]);
    return chat.id;
  }, [activeCharacter, activePersona, activePreset, persistSettings, settings]);

  const selectChat = useCallback(async (id: string) => {
    if (!settings || !chats.some((chat) => chat.id === id)) return;
    await persistSettings({ ...settings, activeChatId: id });
  }, [chats, persistSettings, settings]);

  const renameChat = useCallback(async (id: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('请输入会话名称');
    const chat = chats.find((item) => item.id === id);
    if (!chat) return;
    const next = { ...chat, name: trimmedName, updatedAt: Date.now() };
    await saveChat(next);
    setChats((current) => current.map((item) => item.id === id ? next : item));
  }, [chats]);

  const removeChat = useCallback(async (id: string) => {
    await deleteChatDb(id);
    const remaining = chats.filter((chat) => chat.id !== id);
    setChats(remaining);
    if (settings?.activeChatId === id) {
      await persistSettings({ ...settings, activeChatId: remaining[0]?.id ?? null });
    }
  }, [chats, persistSettings, settings]);

  const sendMessage = useCallback(async (content: string) => {
    const userContent = content.trim();
    if (!userContent) throw new Error('请输入战术指令');
    if (!settings || !activeChat || !activeCharacter || !activePersona || !activePreset) {
      throw new Error('当前会话的角色、身份或预设不完整');
    }
    if (status === 'assembling' || status === 'streaming') return;

    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setStream({ ...EMPTY_STREAM });
    setMatchedEntries([]);
    setStatus('assembling');

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userContent,
      timestamp: Date.now(),
      variables: { ...activeChat.variables },
    };
    const chatWithUser: ChatSession = {
      ...activeChat,
      messages: [...activeChat.messages, userMessage],
      updatedAt: Date.now(),
    };
    await saveChat(chatWithUser);
    setChats((current) => current.map((chat) => chat.id === chatWithUser.id ? chatWithUser : chat));

    try {
      const activeBooks = lorebooks.filter((book) => chatWithUser.lorebookIds.includes(book.id));
      const assembled = assemblePrompt({
        userInput: userContent,
        history: chatWithUser.messages,
        preset: activePreset,
        lorebooks: activeBooks,
        character: activeCharacter,
        persona: activePersona,
        variables: chatWithUser.variables,
        formatPrompt: settings.formatPromptTemplate,
      });
      setMatchedEntries(assembled.matchedEntries);

      const parser = new StreamTagParser(settings.customTags, [...DEFAULT_OPAQUE_TAGS]);
      const events: ParserEvent[] = [];
      setStatus('streaming');
      for await (const chunk of selectedTransport.stream({
        task: 'story',
        messages: assembled.messages,
        api: settings.api,
        model: typeof activePreset.settings.openai_model === 'string' ? activePreset.settings.openai_model : settings.api.model,
        temperature: numberSetting(activePreset.settings.temp_openai),
        maxTokens: numberSetting(activePreset.settings.openai_max_tokens),
        stream: true,
      }, controller.signal)) {
        const chunkEvents = parser.feed(chunk);
        events.push(...chunkEvents);
        setStream((current) => applyStreamEvents(current, chunkEvents));
      }
      const tail = parser.finish();
      events.push(...tail);
      setStream((current) => applyStreamEvents(current, tail));
      const parsed = aggregateEvents(events);
      const rawContent = events.filter((event): event is Extract<ParserEvent, { type: 'raw' }> => event.type === 'raw').map((event) => event.chunk).join('').trim();
      const { nextVariables, snapshot } = applyParsedToChat(chatWithUser.variables, parsed);
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: parsed.maintext.trim() || rawContent || '本轮未返回可显示正文。',
        timestamp: Date.now(),
        variables: { ...nextVariables },
        variablesAfter: snapshot,
        parsed,
        apiUsed: 'primary',
        metadata: {
          lorebookEntries: assembled.matchedEntries.map((entry) => entry.entry.id),
        },
      };
      const completedChat: ChatSession = {
        ...chatWithUser,
        messages: [...chatWithUser.messages, assistantMessage],
        variables: nextVariables,
        updatedAt: Date.now(),
      };
      await saveChat(completedChat);
      setChats((current) => current.map((chat) => chat.id === completedChat.id ? completedChat : chat));
      setStatus('complete');
    } catch (sendError) {
      if (isAbortError(sendError)) {
        setStatus('interrupted');
        return;
      }
      setError(sendError instanceof Error ? sendError.message : '生成失败');
      setStatus('failed');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [activeCharacter, activeChat, activePersona, activePreset, lorebooks, selectedTransport, settings, status]);

  const stopGeneration = useCallback(() => abortRef.current?.abort(), []);

  const truncateAndPersist = useCallback(async (chat: ChatSession, index: number) => {
    const messages = chat.messages.slice(0, index);
    const last = messages.at(-1);
    const variables = last?.variablesAfter ?? last?.variables ?? {};
    const next = { ...chat, messages, variables: { ...variables }, updatedAt: Date.now() };
    await saveChat(next);
    setChats((current) => current.map((item) => item.id === next.id ? next : item));
    return next;
  }, []);

  const retryLastTurn = useCallback(async () => {
    if (!activeChat) return;
    const reverseIndex = [...activeChat.messages].reverse().findIndex((message) => message.role === 'user');
    const index = reverseIndex < 0 ? -1 : activeChat.messages.length - 1 - reverseIndex;
    if (index < 0) return;
    const content = activeChat.messages[index].content;
    await truncateAndPersist(activeChat, index);
    await sendMessage(content);
  }, [activeChat, sendMessage, truncateAndPersist]);

  const editAndRegenerate = useCallback(async (messageId: string, content: string) => {
    if (!activeChat) return;
    const index = activeChat.messages.findIndex((message) => message.id === messageId && message.role === 'user');
    if (index < 0) return;
    await truncateAndPersist(activeChat, index);
    await sendMessage(content);
  }, [activeChat, sendMessage, truncateAndPersist]);

  const deleteMessagesFrom = useCallback(async (messageId: string) => {
    if (!activeChat) return;
    const index = activeChat.messages.findIndex((message) => message.id === messageId);
    if (index < 0) return;
    await truncateAndPersist(activeChat, index);
  }, [activeChat, truncateAndPersist]);

  const branchFromMessage = useCallback(async (messageId: string, name?: string) => {
    if (!activeChat || !settings) throw new Error('没有可分支的活跃会话');
    const index = activeChat.messages.findIndex((message) => message.id === messageId);
    if (index < 0) throw new Error('没有找到分支来源消息');
    const now = Date.now();
    const sourceMessage = activeChat.messages[index];
    const branch: ChatSession = {
      ...activeChat,
      id: crypto.randomUUID(),
      name: name?.trim() || `${activeChat.name} / 分支 ${chats.filter((chat) => chat.parentChatId === activeChat.id).length + 1}`,
      messages: activeChat.messages.slice(0, index + 1).map((message) => ({ ...message })),
      variables: { ...(sourceMessage.variablesAfter ?? sourceMessage.variables ?? activeChat.variables) },
      parentChatId: activeChat.id,
      branchedFromMessageId: messageId,
      createdAt: now,
      updatedAt: now,
    };
    await saveChat(branch);
    await persistSettings({ ...settings, activeChatId: branch.id });
    setChats((current) => [...current, branch]);
    return branch.id;
  }, [activeChat, chats, persistSettings, settings]);

  const updateVariables = useCallback(async (variables: Record<string, unknown>) => {
    if (!activeChat) return;
    const normalized = Object.fromEntries(Object.entries(variables).filter(([key]) => key.trim()));
    const next = { ...activeChat, variables: normalized, updatedAt: Date.now() };
    await saveChat(next);
    setChats((current) => current.map((chat) => chat.id === next.id ? next : chat));
  }, [activeChat]);

  const updateSettings = useCallback(async (next: AppSettings) => {
    await persistSettings(next);
  }, [persistSettings]);

  const upsertCharacter = useCallback(async (character: CharacterCard) => {
    await saveCharacter(character);
    setCharacters((current) => upsertById(current, character));
  }, []);
  const removeCharacter = useCallback(async (id: string) => {
    await deleteCharacterDb(id);
    setCharacters((current) => current.filter((item) => item.id !== id));
  }, []);
  const upsertPersona = useCallback(async (persona: Persona) => {
    await savePersona(persona);
    setPersonas((current) => upsertById(current, persona));
  }, []);
  const removePersona = useCallback(async (id: string) => {
    await deletePersonaDb(id);
    setPersonas((current) => current.filter((item) => item.id !== id));
  }, []);
  const upsertLorebook = useCallback(async (lorebook: Lorebook) => {
    await saveLorebook(lorebook);
    setLorebooks((current) => upsertById(current, lorebook));
  }, []);
  const removeLorebook = useCallback(async (id: string) => {
    await deleteLorebookDb(id);
    setLorebooks((current) => current.filter((item) => item.id !== id));
  }, []);
  const upsertPreset = useCallback(async (preset: ChatPreset) => {
    await savePreset(preset);
    setPresets((current) => upsertById(current, preset));
  }, []);
  const removePreset = useCallback(async (id: string) => {
    await deletePresetDb(id);
    setPresets((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = useMemo<TavernRuntimeValue>(() => ({
    initialized,
    status,
    error,
    transportMode: selectedTransport.mode,
    settings,
    chats,
    characters,
    personas,
    lorebooks,
    presets,
    activeChat,
    activeCharacter,
    activePersona,
    activePreset,
    stream,
    matchedEntries,
    reload: loadAll,
    createChat,
    selectChat,
    renameChat,
    removeChat,
    sendMessage,
    stopGeneration,
    retryLastTurn,
    editAndRegenerate,
    deleteMessagesFrom,
    branchFromMessage,
    updateVariables,
    updateSettings,
    upsertCharacter,
    removeCharacter,
    upsertPersona,
    removePersona,
    upsertLorebook,
    removeLorebook,
    upsertPreset,
    removePreset,
  }), [
    activeCharacter, activeChat, activePersona, activePreset, branchFromMessage, characters, chats,
    createChat, deleteMessagesFrom, editAndRegenerate, error, initialized, loadAll, lorebooks,
    matchedEntries, personas, presets, removeCharacter, removeChat, removeLorebook, removePersona,
    removePreset, renameChat, retryLastTurn, selectChat, selectedTransport.mode, sendMessage, settings,
    status, stopGeneration, stream, updateSettings, updateVariables, upsertCharacter, upsertLorebook,
    upsertPersona, upsertPreset,
  ]);

  return <TavernContext.Provider value={value}>{children}</TavernContext.Provider>;
}

function applyStreamEvents(current: TavernStreamState, events: ParserEvent[]): TavernStreamState {
  const next = { ...current, options: [...current.options] };
  for (const event of events) {
    if (event.type === 'raw') next.raw += event.chunk;
    if (event.type === 'option-line' && event.line.trim()) next.options.push(event.line.trim());
    if (event.type === 'tag-chunk') {
      if (event.tag === 'maintext') next.maintext += event.chunk;
      if (event.tag === 'thinking' || event.tag === 'think') next.thinking += event.chunk;
      if (event.tag === 'sum') next.sum += event.chunk;
      if (event.tag === 'vars') next.varsRaw += event.chunk;
    }
    if (event.type === 'tag-close') {
      if (event.tag === 'maintext') next.maintext = event.full;
      if (event.tag === 'thinking' || event.tag === 'think') next.thinking = event.full;
      if (event.tag === 'sum') next.sum = event.full;
      if (event.tag === 'vars') next.varsRaw = event.full;
    }
  }
  return next;
}

function numberSetting(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((candidate) => candidate.id === item.id)
    ? items.map((candidate) => candidate.id === item.id ? item : candidate)
    : [...items, item];
}
