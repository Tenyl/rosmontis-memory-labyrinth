export interface DiaryV1 { title: string; body: string }
export function parseDiaryV1(value: unknown): DiaryV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('手记 V1 必须是对象。');
  const record = value as Record<string, unknown>;
  if (['reward', 'damage', 'threshold', 'effect', 'sanityDelta', 'overloadDelta', 'nodes', 'edges'].some((key) => Object.hasOwn(record, key))) throw new TypeError('手记不得携带数值或本地规则字段。');
  const title = read(record.title, 64); const body = read(record.body, 600);
  if (!body.includes('我')) throw new TypeError('手记必须使用迷迭香第一人称。');
  return { title, body };
}
function read(value: unknown, max: number) { if (typeof value !== 'string' || !value.trim() || Array.from(value.trim()).length > max) throw new TypeError('手记文本字段无效。'); return value.trim(); }
