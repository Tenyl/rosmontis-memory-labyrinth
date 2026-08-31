import type { MazeNodeType } from '../../game/types';
import {
  isRegisteredChoice,
  isRegisteredIntent,
  isRegisteredModifier,
  type RegisteredCombatIntentId,
} from '../gameplayRegistry';

export type NodePresentationSource = 'local' | 'ai-director' | 'local-fallback';

export interface ValidatedEnemyPlan {
  intentIds: RegisteredCombatIntentId[];
}

export interface NodePresentation {
  version: 1;
  runId: string;
  nodeId: string;
  nodeType: MazeNodeType;
  source: NodePresentationSource;
  title: string;
  description: string;
  choiceIds: string[];
  modifierIds: string[];
  enemyPlan?: ValidatedEnemyPlan;
  quote?: string;
  matchedLorebookEntryIds?: string[];
}

export interface GameDirectorParseContext {
  runId: string;
  nodeId: string;
  nodeType: MazeNodeType;
}

const forbiddenNumericKeys = new Set([
  'ap', 'actionPoints', 'damage', 'reward', 'rewards', 'echoes', 'price', 'healing', 'sanity',
  'overload', 'sanityDelta', 'overloadDelta', 'enemyHp', 'enemyIntegrity', 'stagger', 'topology',
  'edges', 'unlocks', 'victory', 'defeat', 'effect', 'effects',
]);
const directorKeys = new Set([
  'version', 'nodeId', 'nodeType', 'title', 'description', 'choiceIds', 'modifierIds', 'enemyPlan', 'quote',
]);
const enemyPlanKeys = new Set(['intentIds']);

export function parseGameDirectorV1(value: unknown, context: GameDirectorParseContext): NodePresentation {
  const record = requireRecord(value, '游戏导演输出必须是 JSON 对象。');
  rejectForbiddenFields(record);
  rejectUnknownFields(record, directorKeys, '游戏导演');
  if (record.version !== 1) throw new TypeError('游戏导演 Schema 版本必须为 1。');
  if (record.nodeId !== context.nodeId || record.nodeType !== context.nodeType) {
    throw new TypeError('游戏导演输出的节点与本地节点不一致。');
  }
  const choiceIds = requireStringArray(record.choiceIds, '节点选项必须是 ID 数组。', 1, 6);
  for (const id of choiceIds) {
    if (!isRegisteredChoice(context.nodeType, id)) throw new TypeError(`未知的节点选项 ID：${id}。`);
  }
  if (new Set(choiceIds).size !== choiceIds.length) throw new TypeError('节点选项 ID 不得重复。');

  const modifierIds = requireStringArray(record.modifierIds, '节点修饰词必须是 ID 数组。', 0, 5);
  if (new Set(modifierIds).size !== modifierIds.length) throw new TypeError('检测到重复的节点修饰词。');
  for (const id of modifierIds) {
    if (!isRegisteredModifier(id)) throw new TypeError(`未知的节点修饰词 ID：${id}。`);
  }

  const usesIntentPlan = context.nodeType === 'combat' || context.nodeType === 'emergency-combat';
  if (usesIntentPlan && record.enemyPlan === undefined) throw new TypeError('战斗节点必须提供敌方计划。');
  if (!usesIntentPlan && record.enemyPlan !== undefined) throw new TypeError('不使用意图轮转的节点不得提供敌方计划。');

  let enemyPlan: ValidatedEnemyPlan | undefined;
  if (record.enemyPlan !== undefined) {
    const plan = requireRecord(record.enemyPlan, '敌方计划必须是对象。');
    rejectUnknownFields(plan, enemyPlanKeys, '敌方计划');
    const intentIds = requireStringArray(plan.intentIds, '敌方计划必须包含意图 ID。', 1, 3);
    if (intentIds.length > 3) throw new TypeError('敌方计划最多包含 3 个意图。');
    if (new Set(intentIds).size !== intentIds.length) throw new TypeError('检测到重复的敌方意图 ID。');
    if (!intentIds.every(isRegisteredIntent)) throw new TypeError('敌方计划包含未知意图 ID。');
    enemyPlan = { intentIds };
  }

  const quote = record.quote === undefined ? undefined : requireText(record.quote, '即时台词不能为空。', 60);
  return {
    version: 1,
    runId: context.runId,
    nodeId: context.nodeId,
    nodeType: context.nodeType,
    source: 'ai-director',
    title: requireText(record.title, '节点标题不能为空。', 64),
    description: requireText(record.description, '节点描述不能为空。', 360),
    choiceIds,
    modifierIds,
    ...(enemyPlan ? { enemyPlan } : {}),
    ...(quote ? { quote } : {}),
  };
}

function rejectUnknownFields(record: Record<string, unknown>, allowed: ReadonlySet<string>, label: string) {
  const unknown = Object.keys(record).find((key) => !allowed.has(key));
  if (unknown) throw new TypeError(`${label}包含未知字段：${unknown}。`);
}

function rejectForbiddenFields(value: unknown, path = 'root') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => rejectForbiddenFields(item, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (forbiddenNumericKeys.has(key)) throw new TypeError(`游戏导演不得提供数值效果字段：${path}.${key}。`);
    rejectForbiddenFields(nested, `${path}.${key}`);
  }
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(message);
  return value;
}

function requireStringArray(value: unknown, message: string, minimum: number, maximum: number): string[] {
  if (!Array.isArray(value) || value.length < minimum) throw new TypeError(message);
  if (value.length > maximum) {
    if (maximum === 3) throw new TypeError('敌方计划最多包含 3 个意图。');
    throw new TypeError(message);
  }
  if (!value.every((item) => typeof item === 'string' && item.trim())) throw new TypeError(message);
  return value.map((item) => item.trim());
}

function requireText(value: unknown, message: string, maximum: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(message);
  const text = value.trim();
  if (Array.from(text).length > maximum) throw new TypeError(`${message.replace(/。$/, '')}，且不得超过 ${maximum} 个字符。`);
  return text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
