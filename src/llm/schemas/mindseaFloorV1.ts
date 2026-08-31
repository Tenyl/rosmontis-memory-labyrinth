import type { AuthoritativeNovelNode, NovelBlueprintContent } from '../gameContent';
import { parseNovelBlueprint } from '../gameContent';

export function parseMindseaFloorV1(value: unknown, authoritativeNodes: readonly AuthoritativeNovelNode[]): NovelBlueprintContent {
  assertExactKeys(value, ['title', 'theme', 'premise', 'endingHook', 'nodeBriefs'], '无垠心海蓝图');
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.nodeBriefs)) {
    record.nodeBriefs.forEach((brief, index) => {
      assertExactKeys(brief, ['nodeId', 'nodeType', 'title', 'description'], `第 ${index + 1} 个无垠心海节点`);
    });
  }
  return parseNovelBlueprint(value, authoritativeNodes);
}

function assertExactKeys(value: unknown, allowed: readonly string[], label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label}必须是对象。`);
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length) throw new TypeError(`${label}包含未经允许的字段：${unexpected.join('、')}。`);
}
