import type { MazeNodeType } from '../game/types';

export interface TemporaryQuoteContent {
  text: string;
}

export interface AuthoritativeNovelNode {
  id: string;
  type: MazeNodeType;
}

export interface NovelNodeBrief {
  nodeId: string;
  nodeType: MazeNodeType;
  title: string;
  description: string;
}

export interface NovelBlueprintContent {
  title: string;
  theme: string;
  premise: string;
  endingHook: string;
  nodeBriefs: NovelNodeBrief[];
}

const nodeTypes = new Set<MazeNodeType>([
  'combat', 'emergency-combat', 'safehouse', 'shop', 'encounter', 'dilemma', 'unknown', 'boss',
]);
const forbiddenNovelBriefKeys = [
  'hiddenType',
  'revealed',
  'risk',
  'modifiers',
  'reward',
  'rewards',
  'price',
  'damage',
  'effect',
  'effects',
  'sanityDelta',
  'overloadDelta',
  'edges',
  'unlocks',
];

export function parseTemporaryQuote(value: unknown): TemporaryQuoteContent {
  const record = requireRecord(value, '临时台词必须是 JSON 对象。');
  const text = requireString(record.text, '临时台词不能为空。', 120).replace(/\s+/g, ' ').trim();
  if (Array.from(text).length > 30) throw new TypeError('迷迭香临时台词不得超过 30 个字符。');
  if (!text.includes('我')) throw new TypeError('迷迭香临时台词必须使用第一人称。');
  return { text };
}

export function parseNovelBlueprint(
  value: unknown,
  expectedNodes: readonly AuthoritativeNovelNode[],
): NovelBlueprintContent {
  const record = requireRecord(value, '小说迷宫蓝图必须是 JSON 对象。');
  if (!Array.isArray(record.nodeBriefs) || record.nodeBriefs.length !== expectedNodes.length) {
    throw new TypeError(`小说蓝图节点数量必须等于本地迷宫的 ${expectedNodes.length} 个节点。`);
  }
  const expectedById = new Map(expectedNodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const nodeBriefs = record.nodeBriefs.map((brief, index) => {
    const item = requireRecord(brief, `第 ${index + 1} 个节点叙事必须是对象。`);
    if (forbiddenNovelBriefKeys.some((key) => Object.hasOwn(item, key))) {
      throw new TypeError('节点叙事不得包含隐藏结果、数值或其他本地规则字段。');
    }
    const nodeId = requireString(item.nodeId, '节点叙事必须包含 nodeId。', 96);
    if (seen.has(nodeId)) throw new TypeError(`小说蓝图包含重复节点：${nodeId}。`);
    seen.add(nodeId);
    const expected = expectedById.get(nodeId);
    if (!expected) throw new TypeError(`小说蓝图引用未知节点：${nodeId}。`);
    const nodeType = requireString(item.nodeType, '节点叙事必须包含 nodeType。', 32);
    if (!nodeTypes.has(nodeType as MazeNodeType) || nodeType !== expected.type) {
      throw new TypeError(`小说蓝图节点类型与本地节点不一致：${nodeId}。`);
    }
    return {
      nodeId,
      nodeType: nodeType as MazeNodeType,
      title: requireString(item.title, '节点叙事标题不能为空。', 48),
      description: requireString(item.description, '节点叙事描述不能为空。', 240),
    };
  });

  return {
    title: requireString(record.title, '小说迷宫标题不能为空。', 64),
    theme: requireString(record.theme, '小说迷宫主题不能为空。', 96),
    premise: requireString(record.premise, '小说迷宫前提不能为空。', 320),
    endingHook: requireString(record.endingHook, '小说迷宫结尾钩子不能为空。', 240),
    nodeBriefs,
  };
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new TypeError(message);
  return value as Record<string, unknown>;
}

function requireString(value: unknown, message: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(message);
  const text = value.trim();
  if (Array.from(text).length > maxLength) throw new TypeError(`${message.replace(/。$/, '')}，且不得超过 ${maxLength} 个字符。`);
  return text;
}
