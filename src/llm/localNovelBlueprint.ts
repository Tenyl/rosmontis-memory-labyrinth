import { createSeededRandom, randomInt } from '../game/random';
import type { MazeNode, MazeNodeType } from '../game/types';
import type { NovelBlueprintContent } from './gameContent';

const themes = [
  {
    title: '倒悬温室的无声花期',
    theme: '一座用遗忘浇灌、向下生长的玻璃温室',
    premise: '迷迭香必须辨认每株植物保存的声音，找回通往记忆核心的名字。',
    endingHook: '温室天窗开启时，另一片不属于这里的雨云正在靠近。',
  },
  {
    title: '没有终点的夜行列车',
    theme: '一列把站名从乘客记忆中逐个擦除的夜行列车',
    premise: '迷迭香沿着错序车厢前进，把散落的站名重新拼成离开迷宫的路线。',
    endingHook: '列车停下了，但站台广播报出了下一层的编号。',
  },
  {
    title: '沉入雨幕的白色病区',
    theme: '被逆流雨水逐层淹没的空白病区',
    premise: '迷迭香要在档案彻底褪色前确认哪些记录真正属于自己。',
    endingHook: '最后一页病历背面，留下了一扇尚未开启的门。',
  },
] as const;

const nodeTitles: Record<MazeNodeType, readonly string[]> = {
  'combat': ['重复报站的车厢', '拒绝熄灭的手术灯', '碎裂声源走廊'],
  'wonder': ['倒流雨幕', '缺页候车室', '无字档案间'],
  'rest': ['静默玻璃温室', '暖光休息站', '呼吸校准室'],
  'shop': ['残响交换站', '无人值守的柜台', '认知零件库'],
  'unknown': ['未解析信号区', '雾中岔路', '封闭的白色门扉'],
  'boss': ['名字保存库', '终点之前的门', '透明记忆核心'],
};

const nodeDescriptions: Record<MazeNodeType, string> = {
  'combat': '残响实体正在模仿已经发生过的冲突，必须在回声完成闭环前穿过。',
  'wonder': '场景缺失了一段因果，只留下可供迷迭香选择的认知断面。',
  'rest': '稳定信号在此短暂聚合，可以重新校准记忆与现实的边界。',
  'shop': '回收终端以记忆残响标价，陈列着可改变本次探索方式的认知模块。',
  'unknown': '前方信号被噪声覆盖，只有风险等级仍能从紊乱读数中辨认。',
  'boss': '本层破碎记忆在这里重叠，出口藏在仍能被准确说出的事实之后。',
};

export function createLocalNovelBlueprint(
  seed: string,
  floor: number,
  nodes: readonly Pick<MazeNode, 'id' | 'type'>[],
): NovelBlueprintContent {
  let randomState = createSeededRandom(`${seed}:novel-blueprint:${floor}`);
  const [themeIndex, next] = randomInt(randomState, 0, themes.length - 1);
  randomState = next;
  const theme = themes[themeIndex];
  const nodeBriefs = nodes.map((node, index) => {
    const choices = nodeTitles[node.type];
    const [titleIndex, following] = randomInt(randomState, 0, choices.length - 1);
    randomState = following;
    return {
      nodeId: node.id,
      nodeType: node.type,
      title: `${String(index + 1).padStart(2, '0')} · ${choices[titleIndex]}`,
      description: nodeDescriptions[node.type],
    };
  });
  return { ...theme, nodeBriefs };
}
