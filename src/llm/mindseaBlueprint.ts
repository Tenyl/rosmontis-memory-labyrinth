export interface MindseaBlueprint { title: string; theme: string; premise: string; endingHook: string }
const LOCAL_THEMES = ['荒原极光', '罗德岛夏夜甲板', '雨后无人的温室', '移动城市清晨'];

export function createFallbackMindseaBlueprint(seed: string, floor: number, fragments: readonly string[]): MindseaBlueprint {
  const memory = fragments.length ? fragments[stableIndex(`${seed}:${floor}`, fragments.length)] : '仍被呼唤的名字';
  const theme = LOCAL_THEMES[stableIndex(`${seed}:${floor}:theme`, LOCAL_THEMES.length)];
  return {
    title: `无垠心海 · ${theme}`,
    theme: `${theme}与“${memory}”的温柔回声`,
    premise: `我和博士沿着“${memory}”留下的方向继续走。这一次，迷宫不是牢笼，而是一段并肩漫行。`,
    endingHook: '远处又亮起一枚航标，我们可以选择继续前行。',
  };
}
function stableIndex(value: string, length: number) { let hash = 2166136261; for (const char of value) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return (hash >>> 0) % length; }
