import type { CharacterCard, SillyTavernCharacterCardV2 } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === 'string' ? record[key] : '';
}

function stringArrayField(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function importCharacterCardV2(input: unknown): CharacterCard {
  if (!isRecord(input) || input.spec !== 'chara_card_v2' || !isRecord(input.data)) {
    throw new Error('角色卡格式无效，需要 SillyTavern V2 JSON');
  }

  const data = input.data;
  const name = stringField(data, 'name').trim();
  if (!name) throw new Error('角色卡缺少有效名称');

  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    description: stringField(data, 'description'),
    personality: stringField(data, 'personality'),
    scenario: stringField(data, 'scenario'),
    firstMessage: stringField(data, 'first_mes'),
    messageExample: stringField(data, 'mes_example'),
    creatorNotes: stringField(data, 'creator_notes'),
    systemPrompt: stringField(data, 'system_prompt'),
    postHistoryInstructions: stringField(data, 'post_history_instructions'),
    alternateGreetings: stringArrayField(data, 'alternate_greetings'),
    tags: stringArrayField(data, 'tags'),
    creator: stringField(data, 'creator'),
    characterVersion: stringField(data, 'character_version'),
    extensions: isRecord(data.extensions) ? structuredClone(data.extensions) : {},
    createdAt: now,
    updatedAt: now,
  };
}

export function exportCharacterCardV2(card: CharacterCard): SillyTavernCharacterCardV2 {
  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: card.name,
      description: card.description,
      personality: card.personality,
      scenario: card.scenario,
      first_mes: card.firstMessage,
      mes_example: card.messageExample,
      creator_notes: card.creatorNotes,
      system_prompt: card.systemPrompt,
      post_history_instructions: card.postHistoryInstructions,
      alternate_greetings: [...card.alternateGreetings],
      tags: [...card.tags],
      creator: card.creator,
      character_version: card.characterVersion,
      extensions: structuredClone(card.extensions),
    },
  };
}
