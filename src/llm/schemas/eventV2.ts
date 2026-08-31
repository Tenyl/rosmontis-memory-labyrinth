import { DIRECTOR_INTENTS, type DirectorIntent } from '../gameContent';

export const D20_THRESHOLDS = [8, 10, 12, 14, 16, 18] as const;
export type EventCheckAttribute = 'stability' | 'perception' | 'will';
export interface EventV2Choice { id: string; label: string; description: string; intent: DirectorIntent; check: { attribute: EventCheckAttribute; threshold: typeof D20_THRESHOLDS[number] } }
export interface EventV2 { title: string; situation: string; choices: EventV2Choice[] }

export function parseEventV2(value: unknown): EventV2 {
  const record = asRecord(value, '事件 V2 必须是对象。');
  if (!Array.isArray(record.choices) || record.choices.length < 2 || record.choices.length > 3) throw new TypeError('事件 V2 必须包含 2 至 3 个选项。');
  const ids = new Set<string>();
  const choices = record.choices.map((raw) => {
    const item = asRecord(raw, '事件选项必须是对象。');
    const check = asRecord(item.check, '事件选项必须包含 D20 检定。');
    const attribute = text(check.attribute, 24) as EventCheckAttribute;
    const threshold = check.threshold;
    if (!['stability', 'perception', 'will'].includes(attribute) || !D20_THRESHOLDS.includes(threshold as never)) throw new TypeError('D20 属性或阈值不在本地白名单内。');
    const id = text(item.id, 48);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || ids.has(id)) throw new TypeError('事件选项 ID 无效或重复。');
    ids.add(id);
    const intent = text(item.intent, 24) as DirectorIntent;
    if (!DIRECTOR_INTENTS.includes(intent)) throw new TypeError('事件意图不在本地白名单内。');
    return { id, label: text(item.label, 36), description: text(item.description, 120), intent, check: { attribute, threshold: threshold as EventV2Choice['check']['threshold'] } };
  });
  return { title: text(record.title, 48), situation: text(record.situation, 320), choices };
}

function asRecord(value: unknown, message: string): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(message); return value as Record<string, unknown>; }
function text(value: unknown, max: number): string { if (typeof value !== 'string' || !value.trim() || Array.from(value.trim()).length > max) throw new TypeError('Schema 文本字段无效。'); return value.trim(); }
