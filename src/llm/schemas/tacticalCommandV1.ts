export const TACTICAL_ACTION_IDS = [
  'sword:breach',
  'sword:watch',
  'sword:perception',
  'sword:resonance',
  'recover',
  'comfort:hold-hand',
  'comfort:touch-forehead',
] as const;

export type TacticalActionId = typeof TACTICAL_ACTION_IDS[number];

export interface TacticalCommandPlan {
  version: 1;
  actionIds: TacticalActionId[];
  explanation: string;
}

const actionIds = new Set<string>(TACTICAL_ACTION_IDS);
const forbiddenKeys = new Set(['damage', 'reward', 'ap', 'actionPoints', 'sanity', 'overload', 'effect', 'effects']);

export function parseTacticalCommandV1(value: unknown): TacticalCommandPlan {
  if (!isRecord(value)) throw new TypeError('战术指令必须是 JSON 对象。');
  for (const key of Object.keys(value)) {
    if (forbiddenKeys.has(key)) throw new TypeError('战术指令不得携带数值效果。');
  }
  if (value.version !== 1) throw new TypeError('战术指令版本必须为 1。');
  if (!Array.isArray(value.actionIds) || value.actionIds.length === 0) throw new TypeError('战术指令至少包含一个动作。');
  if (value.actionIds.length > 4) throw new TypeError('战术指令最多 4 个动作。');
  if (!value.actionIds.every((id) => typeof id === 'string' && actionIds.has(id))) {
    throw new TypeError('战术指令包含未知动作 ID。');
  }
  if (typeof value.explanation !== 'string' || !value.explanation.trim()) throw new TypeError('战术说明不能为空。');
  const explanation = value.explanation.trim();
  if (Array.from(explanation).length > 160) throw new TypeError('战术说明不得超过 160 个字符。');
  return { version: 1, actionIds: [...value.actionIds] as TacticalActionId[], explanation };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
