import type { AuthoritativeNovelNode, NovelBlueprintContent } from '../gameContent';
import { parseNovelBlueprint } from '../gameContent';

export function parseMindseaFloorV1(value: unknown, authoritativeNodes: readonly AuthoritativeNovelNode[]): NovelBlueprintContent {
  return parseNovelBlueprint(value, authoritativeNodes);
}
