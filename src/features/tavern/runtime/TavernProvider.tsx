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
  clearChats as clearChatsDb,
  deleteCharacter as deleteCharacterDb,
  deleteChat as deleteChatDb,
  deleteLorebook as deleteLorebookDb,
  deletePersona as deletePersonaDb,
  deletePreset as deletePresetDb,
  getCharacters,
  getChat,
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
  type CreateChatOptions,
  type Lorebook,
  type MatchedEntry,
  type ParsedTags,
  type ParserEvent,
  type Persona,
} from '../../../sillytavern';
import { useGameStore } from '../../../store/gameStore';
import { projectTavernTurn } from '../projection/tavern-turn-projector';
import { LocalTavernTransport } from './local-tavern-transport';
import { OpenAiTavernTransport } from './openai-tavern-transport';
import { AnimationFrameBatcher } from './animation-frame-batcher';
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
  createChat: (name: string, options?: CreateChatOptions) => Promise<string>;
  selectChat: (id: string) => Promise<void>;
  renameChat: (id: string, name: string) => Promise<void>;
  removeChat: (id: string) => Promise<void>;
  clearChats: () => Promise<void>;
  sendMessage: (content: string, chatId?: string) => Promise<void>;
  stopGeneration: () => void;
  retryLastTurn: (chatId?: string) => Promise<void>;
  editAndRegenerate: (messageId: string, content: string, chatId?: string) => Promise<void>;
  deleteMessagesFrom: (messageId: string, chatId?: string) => Promise<void>;
  branchFromMessage: (messageId: string, name?: string, chatId?: string) => Promise<string>;
  branchChat: (chatId: string, name?: string) => Promise<string>;
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
  const applyTavernEvents = useGameStore((state) => state.applyTavernEvents);
  const activateTavernProjection = useGameStore((state) => state.activateTavernProjection);
  const reconcileTavernProjection = useGameStore((state) => state.reconcileTavernProjection);
  const branchTavernProjection = useGameStore((state) => state.branchTavernProjection);

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

  useEffect(() => {
    if (!initialized) return;
    activateTavernProjection(activeChat?.purpose === 'game-run' ? activeChat.id : null);
  }, [activeChat?.id, activeChat?.purpose, activateTavernProjection, initialized]);
  const selectedTransport = useMemo<TavernTransport>(() => {
    if (transport) return transport;
    return settings?.api.apiKey.trim() ? new OpenAiTavernTransport() : new LocalTavernTransport();
  }, [settings?.api.apiKey, transport]);

  const persistSettings = useCallback(async (next: AppSettings) => {
    await saveSettings(next);
    setSettingsState(next);
  }, []);

  const createChat = useCallback(async (name: string, options: CreateChatOptions = {}) => {
    if (!settings) throw new Error('酒馆设置尚未载入');
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('请输入会话名称');
    const now = Date.now();
    const chat: ChatSession = {
      id: crypto.randomUUID(),
      name: trimmedName,
      messages: [],
      characterName: characters.find((item) => item.id === options.characterId)?.name ?? activeCharacter?.name ?? settings.characterName,
      userName: personas.find((item) => item.id === options.personaId)?.name ?? activePersona?.name ?? settings.userName,
      characterId: options.characterId ?? activeCharacter?.id ?? settings.activeCharacterId,
      personaId: options.personaId ?? activePersona?.id ?? settings.activePersonaId,
      parentChatId: null,
      branchedFromMessageId: null,
      purpose: options.purpose ?? 'game-run',
      runId: options.runId ?? null,
      presetId: options.presetId ?? activePreset?.id ?? settings.activePresetId,
      lorebookIds: [...(options.lorebookIds ?? settings.activeLorebookIds)],
      variables: { ...(activePersona?.variables ?? {}) },
      createdAt: now,
      updatedAt: now,
    };
    await saveChat(chat);
    if (options.activate !== false) await persistSettings({ ...settings, activeChatId: chat.id });
    setChats((current) => [...current, chat]);
    return chat.id;
  }, [activeCharacter, activePersona, activePreset, characters, persistSettings, personas, settings]);

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

  const clearChats = useCallback(async () => {
    if (!settings) return;
    await clearChatsDb();
    await persistSettings({ ...settings, activeChatId: null });
    setChats([]);
    activateTavernProjection(null);
  }, [activateTavernProjection, persistSettings, settings]);

  const generateMessage = useCallback(async (content: string, sourceChat?: ChatSession) => {
    const userContent = content.trim();
    if (!userContent) throw new Error('请输入战术指令');
    const currentChat = sourceChat ?? activeChat;
    const chatCharacter = characters.find((item) => item.id === currentChat?.characterId) ?? activeCharacter;
    const chatPersona = personas.find((item) => item.id === currentChat?.personaId) ?? activePersona;
    const chatPreset = presets.find((item) => item.id === currentChat?.presetId) ?? activePreset;
    if (!settings || !currentChat || !chatCharacter || !chatPersona || !chatPreset) {
      throw new Error('当前会话的角色、身份或预设不完整');
    }
    if (status === 'assembling' || status === 'streaming') return;

    const controller = new AbortController();
    const streamBatcher = new AnimationFrameBatcher<ParserEvent>((batch) => {
      setStream((current) => applyStreamEvents(current, batch));
    });
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
      variables: { ...currentChat.variables },
    };
    const chatWithUser: ChatSession = {
      ...currentChat,
      messages: [...currentChat.messages, userMessage],
      updatedAt: Date.now(),
    };
    await saveChat(chatWithUser);
    setChats((current) => current.map((chat) => chat.id === chatWithUser.id ? chatWithUser : chat));

    try {
      const activeBooks = lorebooks.filter((book) => chatWithUser.lorebookIds.includes(book.id));
      const assembled = assemblePrompt({
        userInput: userContent,
        history: chatWithUser.messages,
        preset: chatPreset,
        lorebooks: activeBooks,
        character: chatCharacter,
        persona: chatPersona,
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
        model: typeof chatPreset.settings.openai_model === 'string' ? chatPreset.settings.openai_model : settings.api.model,
        temperature: numberSetting(chatPreset.settings.temp_openai),
        maxTokens: numberSetting(chatPreset.settings.openai_max_tokens),
        stream: true,
        offlineContext: (() => {
          const game = useGameStore.getState();
          const currentNode = game.maze.nodes.find((node) => node.id === game.run.currentNodeId) ?? game.maze.nodes[0];
          return {
            randomState: game.randomState,
            nodeType: currentNode.type,
            sanity: game.rosmontis.sanity,
            overload: game.rosmontis.overload,
            fragments: [...game.memoryInventory.fragments, ...game.memoryInventory.coreFragments],
          };
        })(),
      }, controller.signal)) {
        const chunkEvents = parser.feed(chunk);
        events.push(...chunkEvents);
        streamBatcher.enqueue(chunkEvents);
      }
      const tail = parser.finish();
      events.push(...tail);
      streamBatcher.enqueue(tail);
      streamBatcher.flushNow();
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
      if (completedChat.purpose === 'game-run') {
        applyTavernEvents(projectTavernTurn({
          sessionId: completedChat.id,
          messageId: assistantMessage.id,
          summary: parsed.sum,
          variables: nextVariables,
          previousVariables: chatWithUser.variables,
          matchedLorebookEntryIds: assistantMessage.metadata?.lorebookEntries,
        }), completedChat.id);
      }
      setStatus('complete');
    } catch (sendError) {
      if (isAbortError(sendError)) {
        setStatus('interrupted');
        return;
      }
      setError(sendError instanceof Error ? sendError.message : '生成失败');
      setStatus('failed');
    } finally {
      streamBatcher.flushNow();
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [activeCharacter, activeChat, activePersona, activePreset, applyTavernEvents, characters, lorebooks, personas, presets, selectedTransport, settings, status]);

  const sendMessage = useCallback(async (content: string, chatId?: string) => {
    const sourceChat = chatId ? chats.find((chat) => chat.id === chatId) ?? await getChat(chatId) : undefined;
    if (chatId && !sourceChat) throw new Error('没有找到目标会话');
    await generateMessage(content, sourceChat);
  }, [chats, generateMessage]);

  const stopGeneration = useCallback(() => abortRef.current?.abort(), []);

  const truncateAndPersist = useCallback(async (chat: ChatSession, index: number) => {
    const messages = chat.messages.slice(0, index);
    const last = messages.at(-1);
    const variables = last?.variablesAfter ?? last?.variables ?? {};
    const next = { ...chat, messages, variables: { ...variables }, updatedAt: Date.now() };
    await saveChat(next);
    setChats((current) => current.map((item) => item.id === next.id ? next : item));
    if (next.purpose === 'game-run') {
      reconcileTavernProjection(next.id, next.messages.map((message) => message.id));
    }
    return next;
  }, [reconcileTavernProjection]);

  const retryLastTurn = useCallback(async (chatId?: string) => {
    const targetChat = chatId ? chats.find((chat) => chat.id === chatId) ?? await getChat(chatId) : activeChat;
    if (!targetChat) return;
    const reverseIndex = [...targetChat.messages].reverse().findIndex((message) => message.role === 'user');
    const index = reverseIndex < 0 ? -1 : targetChat.messages.length - 1 - reverseIndex;
    if (index < 0) return;
    const content = targetChat.messages[index].content;
    const truncated = await truncateAndPersist(targetChat, index);
    await generateMessage(content, truncated);
  }, [activeChat, chats, generateMessage, truncateAndPersist]);

  const editAndRegenerate = useCallback(async (messageId: string, content: string, chatId?: string) => {
    const targetChat = chatId ? chats.find((chat) => chat.id === chatId) ?? await getChat(chatId) : activeChat;
    if (!targetChat) return;
    const index = targetChat.messages.findIndex((message) => message.id === messageId && message.role === 'user');
    if (index < 0) return;
    const truncated = await truncateAndPersist(targetChat, index);
    await generateMessage(content, truncated);
  }, [activeChat, chats, generateMessage, truncateAndPersist]);

  const deleteMessagesFrom = useCallback(async (messageId: string, chatId?: string) => {
    const targetChat = chatId ? chats.find((chat) => chat.id === chatId) ?? await getChat(chatId) : activeChat;
    if (!targetChat) return;
    const index = targetChat.messages.findIndex((message) => message.id === messageId);
    if (index < 0) return;
    await truncateAndPersist(targetChat, index);
  }, [activeChat, chats, truncateAndPersist]);

  const createBranch = useCallback(async (sourceChat: ChatSession, messageId: string, name?: string) => {
    if (!settings) throw new Error('酒馆设置尚未载入');
    const index = sourceChat.messages.findIndex((message) => message.id === messageId);
    if (index < 0) throw new Error('没有找到分支来源消息');
    const now = Date.now();
    const sourceMessage = sourceChat.messages[index];
    const branch: ChatSession = {
      ...sourceChat,
      id: crypto.randomUUID(),
      name: name?.trim() || `${sourceChat.name} / 分支 ${chats.filter((chat) => chat.parentChatId === sourceChat.id).length + 1}`,
      messages: sourceChat.messages.slice(0, index + 1).map((message) => ({ ...message })),
      variables: { ...(sourceMessage.variablesAfter ?? sourceMessage.variables ?? sourceChat.variables) },
      parentChatId: sourceChat.id,
      branchedFromMessageId: messageId,
      createdAt: now,
      updatedAt: now,
    };
    await saveChat(branch);
    await persistSettings({ ...settings, activeChatId: branch.id });
    setChats((current) => [...current, branch]);
    if (branch.purpose === 'game-run') {
      branchTavernProjection(sourceChat.id, branch.id, branch.messages.map((message) => message.id));
    }
    return branch.id;
  }, [branchTavernProjection, chats, persistSettings, settings]);

  const branchFromMessage = useCallback(async (messageId: string, name?: string, chatId?: string) => {
    const targetChat = chatId ? chats.find((chat) => chat.id === chatId) ?? await getChat(chatId) : activeChat;
    if (!targetChat) throw new Error('没有可分支的活跃会话');
    return createBranch(targetChat, messageId, name);
  }, [activeChat, chats, createBranch]);

  const branchChat = useCallback(async (chatId: string, name?: string) => {
    const sourceChat = chats.find((chat) => chat.id === chatId);
    if (!sourceChat) throw new Error('没有找到待分支会话');
    const sourceMessage = sourceChat.messages.at(-1);
    if (!sourceMessage) throw new Error('空会话无法建立分支');
    return createBranch(sourceChat, sourceMessage.id, name);
  }, [chats, createBranch]);

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
    clearChats,
    sendMessage,
    stopGeneration,
    retryLastTurn,
    editAndRegenerate,
    deleteMessagesFrom,
    branchFromMessage,
    branchChat,
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
    activeCharacter, activeChat, activePersona, activePreset, branchChat, branchFromMessage, characters, chats,
    clearChats, createChat, deleteMessagesFrom, editAndRegenerate, error, initialized, loadAll, lorebooks,
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
