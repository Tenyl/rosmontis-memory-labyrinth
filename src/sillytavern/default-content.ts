import {
  getChats,
  getCharacters,
  getLorebooks,
  getPersonas,
  getPresets,
  getSettings,
  saveCharacter,
  saveChat,
  saveLorebook,
  savePersona,
  savePreset,
  saveSettings,
} from './database';
import {
  DEFAULT_PROMPT_ORDER,
  DEFAULT_SETTINGS,
  type CharacterCard,
  type ChatPreset,
  type ChatSession,
  type Lorebook,
  type LorebookEntry,
  type Persona,
} from './types';

export const DEFAULT_CHARACTER_ID = 'character-rosmontis';
export const DEFAULT_PERSONA_ID = 'persona-doctor';
export const DEFAULT_PRESET_ID = 'preset-cognition-tactics';
export const DEFAULT_CHAT_ID = 'chat-rain-echo';

const DEFAULT_LOREBOOK_IDS = [
  'lorebook-rhodes-protocol',
  'lorebook-rosmontis-cognition',
  'lorebook-chernobog-echo',
] as const;

function createEntry(
  id: string,
  keys: string[],
  content: string,
  overrides: Partial<LorebookEntry> = {},
): LorebookEntry {
  return {
    id,
    keys,
    secondaryKeys: [],
    content,
    comment: content.slice(0, 36),
    order: 100,
    position: 'after_char',
    depth: 4,
    role: 0,
    selective: false,
    selectiveLogic: 'and_any',
    constant: false,
    probability: 100,
    useProbability: false,
    addMemo: false,
    sticky: 0,
    cooldown: 0,
    delay: 0,
    weight: 100,
    scanDepth: 0,
    caseSensitive: false,
    matchWholeWords: false,
    excludeRecursion: false,
    preventRecursion: false,
    useGroupScoring: false,
    matchPersonaDescription: false,
    matchCharacterDescription: false,
    matchCharacterPersonality: false,
    matchCharacterDepthPrompt: false,
    matchScenario: false,
    matchCreatorNotes: false,
    group: '',
    decorators: [],
    characterFilter: { isExclude: false, names: [], tags: [] },
    ...overrides,
  };
}

function defaultCharacter(now: number): CharacterCard {
  return {
    id: DEFAULT_CHARACTER_ID,
    name: '迷迭香',
    description: '罗德岛精英干员。她能以源石技艺搬运大型物体，并通过记忆残响感知被掩埋的意识痕迹。',
    personality: '寡言、敏锐、认真。她会用短句描述感知，不夸大结论，并在精神负荷上升时主动提醒博士。',
    scenario: '博士陪同迷迭香进入“雨幕回声”意识战场。医疗部与战术指挥链正在远程监控，本次行动必须记录所有异常记忆、敌我态势与精神负荷变化。',
    firstMessage: '博士，链接已经稳定。雨声不是从外面传来的——它在这段记忆里面。',
    messageExample: '<START>\n{{user}}：先确认走廊尽头的声音。\n{{char}}：三个声源。没有脚步，只有呼吸。它们知道我们在这里。',
    creatorNotes: '罗德岛意识战术终端默认角色卡。适用于中文战术 TRPG 与剧情探索。',
    systemPrompt: '以冷静、克制、具象的中文描写迷迭香与环境。不要替博士决定行动。所有战术变化必须可追溯。',
    postHistoryInstructions: '每轮推进一个可观察线索，并在适用时更新精神负荷、风险、记忆节点或档案变量。',
    alternateGreetings: ['博士，我们可以开始。医疗部正在监听。', '连接恢复。刚才的记忆没有消失，它只是退到了更深处。'],
    tags: ['罗德岛', '迷迭香', '战术跑团', '意识探索'],
    creator: 'Rhodes Cognition Terminal',
    characterVersion: '1.0.0',
    extensions: { world: 'rhodes-memory', depth_prompt: { depth: 4, prompt: '以感知残响回应博士' } },
    lorebookId: 'lorebook-rosmontis-cognition',
    createdAt: now,
    updatedAt: now,
  };
}

function defaultPersona(now: number): Persona {
  return {
    id: DEFAULT_PERSONA_ID,
    name: '博士',
    description: '罗德岛博士，本次意识作战的现场决策者。负责下达行动、平衡情报收益与干员安全。',
    variables: { clearance: 4, command_authority: '罗德岛博士' },
    createdAt: now,
    updatedAt: now,
  };
}

function defaultLorebooks(now: number): Lorebook[] {
  return [
    {
      id: DEFAULT_LOREBOOK_IDS[0],
      name: '罗德岛行动协议',
      description: '行动纪律、医疗监测与风险处置的常驻规则。',
      entries: [
        createEntry('lore-rhodes-command', ['博士', '罗德岛'], '博士拥有现场战术决策权，但不得隐瞒对干员精神状态的已知风险。', { constant: true, order: 10, position: 'before_char' }),
        createEntry('lore-rhodes-medical', ['精神负荷', '理智'], '精神负荷达到 70 时应建议暂停深入；达到 85 时必须提示紧急撤离方案。', { order: 30 }),
      ],
      recursiveScanning: true,
      caseSensitive: false,
      matchWholeWords: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEFAULT_LOREBOOK_IDS[1],
      name: '迷迭香认知档案',
      description: '迷迭香的认知表现、沟通习惯与源石技艺边界。',
      entries: [
        createEntry('lore-rosmontis-perception', ['迷迭香', '记忆'], '迷迭香会把强烈记忆描述成具有重量、方向和距离的实体，不会把推测伪装成事实。', { selective: true, secondaryKeys: ['声音', '残响', '意识'], selectiveLogic: 'and_any', order: 40 }),
        createEntry('lore-rosmontis-arts', ['源石技艺', '法术'], '迷迭香的源石技艺可以作用于不可见的大型物体，但持续精确控制会明显增加精神负荷。', { order: 50 }),
      ],
      recursiveScanning: true,
      caseSensitive: false,
      matchWholeWords: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: DEFAULT_LOREBOOK_IDS[2],
      name: '切尔诺伯格残响',
      description: '污染记忆中的地点、人物与重复意象。',
      entries: [
        createEntry('lore-chernobog-rain', ['雨', '雨幕'], '这场雨只存在于记忆中。雨滴落在金属表面时会重复一段被删除的医疗编号。', { order: 70 }),
        createEntry('lore-chernobog-ward', ['疗养院', '病历', '诊疗层'], '废弃疗养院的病历被同一种蓝黑墨水涂改，页角残留儿童手写的数字九。', { order: 80 }),
      ],
      recursiveScanning: true,
      caseSensitive: false,
      matchWholeWords: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function defaultPreset(now: number): ChatPreset {
  return {
    id: DEFAULT_PRESET_ID,
    name: '认知战术叙事',
    description: '面向迷迭香意识战场的中文游戏模式预设。',
    settings: {
      temp_openai: 0.75,
      freq_pen_openai: 0.15,
      pres_pen_openai: 0.1,
      top_p_openai: 0.92,
      openai_max_context: 16384,
      openai_max_tokens: 1800,
      stream_openai: true,
      openai_model: 'gpt-4.1-mini',
      main: '你是罗德岛意识战术跑团主持人。围绕 {{char}} 与 {{user}} 推进冷峻、克制、可调查的中文剧情。不要替 {{user}} 选择行动。',
      prompts: [],
      prompt_order: DEFAULT_PROMPT_ORDER.map((item) => ({ ...item, enabled: true })),
    },
    createdAt: now,
    updatedAt: now,
  };
}

function defaultChat(now: number): ChatSession {
  return {
    id: DEFAULT_CHAT_ID,
    name: '雨幕回声',
    characterName: '迷迭香',
    userName: '博士',
    characterId: DEFAULT_CHARACTER_ID,
    personaId: DEFAULT_PERSONA_ID,
    parentChatId: null,
    branchedFromMessageId: null,
    presetId: DEFAULT_PRESET_ID,
    lorebookIds: [...DEFAULT_LOREBOOK_IDS],
    variables: { rosmontis_stress: 39, sanity: 62, risk: 'B', objective: '识别雨幕中的儿童意识回声' },
    messages: [
      {
        id: 'message-rain-opening',
        role: 'assistant',
        content: '博士，链接已经稳定。雨声不是从外面传来的——它在这段记忆里面。',
        timestamp: now,
        variables: { rosmontis_stress: 39, sanity: 62 },
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export async function seedDefaultTavernContent(): Promise<void> {
  const now = Date.now();
  const [characters, personas, lorebooks, presets, chats, settings] = await Promise.all([
    getCharacters(),
    getPersonas(),
    getLorebooks(),
    getPresets(),
    getChats(),
    getSettings(),
  ]);

  if (!characters.some((item) => item.id === DEFAULT_CHARACTER_ID)) {
    await saveCharacter(defaultCharacter(now));
  }
  if (!personas.some((item) => item.id === DEFAULT_PERSONA_ID)) {
    await savePersona(defaultPersona(now));
  }
  for (const lorebook of defaultLorebooks(now)) {
    if (!lorebooks.some((item) => item.id === lorebook.id)) await saveLorebook(lorebook);
  }
  if (!presets.some((item) => item.id === DEFAULT_PRESET_ID)) {
    await savePreset(defaultPreset(now));
  }
  if (!chats.some((item) => item.id === DEFAULT_CHAT_ID)) {
    await saveChat(defaultChat(now));
  }

  const nextSettings = settings ?? { ...DEFAULT_SETTINGS, key: 'settings' };
  const shouldUpdateSettings =
    nextSettings.activeCharacterId === null ||
    nextSettings.activePersonaId === null ||
    nextSettings.activePresetId === null ||
    nextSettings.activeLorebookIds.length === 0;
  if (shouldUpdateSettings) {
    await saveSettings({
      ...nextSettings,
      activeCharacterId: nextSettings.activeCharacterId ?? DEFAULT_CHARACTER_ID,
      activePersonaId: nextSettings.activePersonaId ?? DEFAULT_PERSONA_ID,
      activePresetId: nextSettings.activePresetId ?? DEFAULT_PRESET_ID,
      activeLorebookIds: nextSettings.activeLorebookIds.length > 0 ? nextSettings.activeLorebookIds : [...DEFAULT_LOREBOOK_IDS],
      characterName: nextSettings.characterName === 'AI' ? '迷迭香' : nextSettings.characterName,
      userName: nextSettings.userName === '用户' ? '博士' : nextSettings.userName,
    });
  }
}
