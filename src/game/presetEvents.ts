import { randomInt } from './random';
import type { MazeNodeType, MemoryFragment, SeededRandomState } from './types';

export interface PresetEventEffect {
  sanityDelta: number;
  overloadDelta: number;
}

export interface PresetEventChoice {
  id: string;
  label: string;
  description: string;
  effect: PresetEventEffect;
}

export interface PresetEventDraft {
  id: string;
  nodeType: MazeNodeType;
  title: string;
  body: string;
  context: string;
  choices: PresetEventChoice[];
}

export interface SelectPresetEventInput {
  randomState: SeededRandomState;
  nodeType: MazeNodeType;
  sanity: number;
  overload: number;
  fragments: readonly MemoryFragment[];
}

interface PresetEventTemplate extends Omit<PresetEventDraft, 'context'> {}

const PRESET_EVENT_POOL: Record<MazeNodeType, PresetEventTemplate[]> = {
  'combat': [
    {
      id: 'combat-collapsed-ward',
      nodeType: 'combat',
      title: '坍塌病区的回声',
      body: '废弃病床在走廊上自行排成封锁线，床帘后反复传来同一次短促的求救。迷迭香确认那并非活人的声音。',
      choices: [
        { id: 'breach-line', label: '以破壁巨剑撕开封锁', description: '主动打断回声实体的阵列。', effect: { sanityDelta: -3, overloadDelta: 12 } },
        { id: 'watch-advance', label: '展开守望阵位缓慢推进', description: '用防护场隔离近距离污染。', effect: { sanityDelta: 1, overloadDelta: 6 } },
        { id: 'withdraw-mark', label: '标记威胁并暂时后撤', description: '保留当前路线，避免正面接触。', effect: { sanityDelta: 2, overloadDelta: -4 } },
      ],
    },
    {
      id: 'combat-weightless-classroom',
      nodeType: 'combat',
      title: '失重教室',
      body: '桌椅悬在半空，粉笔字从黑板上剥落并凝成攻击性的白色轮廓。每一次擦除都会令它们变得更清晰。',
      choices: [
        { id: 'break-board', label: '摧毁记忆依附的黑板', description: '切断实体与场景之间的锚点。', effect: { sanityDelta: -2, overloadDelta: 10 } },
        { id: 'hold-silence', label: '维持静默等待轮廓消散', description: '拒绝回应场景对记忆的诱导。', effect: { sanityDelta: 2, overloadDelta: -3 } },
      ],
    },
  ],
  'emergency-combat': [
    {
      id: 'emergency-combat-neural-storm',
      nodeType: 'emergency-combat',
      title: '神经风暴封锁区',
      body: '高密度残响沿金属墙面反复折射，实体护盾正在持续增生。终端将这里标记为高威胁作战区。',
      choices: [
        { id: 'emergency-breach', label: '使用破壁强行击穿', description: '承受额外过载，快速击穿增生护盾。', effect: { sanityDelta: -5, overloadDelta: 16 } },
        { id: 'emergency-watch', label: '使用守望稳步推进', description: '牺牲速度换取稳定的防护窗口。', effect: { sanityDelta: 2, overloadDelta: 9 } },
      ],
    },
  ],
  'encounter': [
    {
      id: 'wonder-reversed-rain',
      nodeType: 'encounter',
      title: '向上坠落的雨',
      body: '雨滴从地面积水升向天花板，带走沿途所有可以辨认的倒影。迷迭香在其中看见一段被剪去开头的病历。',
      choices: [
        { id: 'scan-rain', label: '感知雨滴中的记忆纹理', description: '追踪被倒影带走的残留信息。', effect: { sanityDelta: -1, overloadDelta: 7 } },
        { id: 'cross-quickly', label: '沿无倒影区域快速通过', description: '放弃额外情报，降低停留风险。', effect: { sanityDelta: 1, overloadDelta: 2 } },
        { id: 'anchor-fragment', label: '用现有碎片建立认知锚点', description: '让已找回的记忆校准异常雨幕。', effect: { sanityDelta: 3, overloadDelta: -2 } },
      ],
    },
    {
      id: 'wonder-missing-stair',
      nodeType: 'encounter',
      title: '缺失的第十三阶',
      body: '楼梯每次被计数都会少去同一阶。空缺处没有深坑，只有一段无法被语言描述的白色间隔。',
      choices: [
        { id: 'measure-gap', label: '让感知巨剑测量空缺', description: '用战术回波确定可通行边界。', effect: { sanityDelta: -1, overloadDelta: 8 } },
        { id: 'step-by-memory', label: '闭眼依照肌肉记忆迈步', description: '避免直接认知那段异常间隔。', effect: { sanityDelta: -4, overloadDelta: 1 } },
      ],
    },
  ],
  'safehouse': [
    {
      id: 'rest-turning-nameplate',
      nodeType: 'safehouse',
      title: '反复翻转的病室门牌',
      body: '迷迭香抬起手，雨滴在她身前三厘米处停住。走廊尽头的病室门牌在空白与模糊编号之间反复翻转，门后传来三个频率完全相同的呼吸声。',
      choices: [
        { id: 'inspect-sign', label: '检查门牌背面的刻痕', description: '确认编号是否曾被人为覆盖。', effect: { sanityDelta: -1, overloadDelta: 3 } },
        { id: 'compare-breathing', label: '比对三组呼吸频率', description: '寻找意识回声之间的细微偏差。', effect: { sanityDelta: 1, overloadDelta: 2 } },
        { id: 'set-anchor', label: '沿安全线建立感知锚点', description: '为下一次深入保留稳定坐标。', effect: { sanityDelta: 3, overloadDelta: -4 } },
      ],
    },
    {
      id: 'rest-glass-greenhouse',
      nodeType: 'safehouse',
      title: '玻璃思维温室',
      body: '透明墙面后长满没有气味的迷迭香。叶片碰触玻璃时，会播放一段安静到近乎虚假的午后。',
      choices: [
        { id: 'rest-inside', label: '在温室边缘短暂休息', description: '降低神经链路带宽，让思绪重新排列。', effect: { sanityDelta: 8, overloadDelta: -10 } },
        { id: 'sample-leaf', label: '采集一片无气味的叶片', description: '记录这段安定记忆的物理残留。', effect: { sanityDelta: 3, overloadDelta: 1 } },
      ],
    },
  ],
  'dilemma': [
    {
      id: 'dilemma-memory-exchange',
      nodeType: 'dilemma',
      title: '等价记忆置换',
      body: '两段互相排斥的记忆悬在通道两侧：一段能够减轻痛苦，另一段则能强化战斗本能。迷迭香无法同时带走它们。',
      choices: [
        { id: 'dilemma-release-pain', label: '放下痛苦记忆', description: '恢复稳定性，但失去一次强化机会。', effect: { sanityDelta: 8, overloadDelta: -8 } },
        { id: 'dilemma-keep-instinct', label: '保留战术本能', description: '接受更高神经负荷，换取危险路径的优势。', effect: { sanityDelta: -4, overloadDelta: 14 } },
      ],
    },
  ],
  'shop': [
    {
      id: 'shop-silent-terminal',
      nodeType: 'shop',
      title: '无声回收终端',
      body: '一台没有操作员的终端仍在运行，屏幕以记忆残响标注认知零件的交换价值。',
      choices: [
        { id: 'inspect-stock', label: '检查本次库存', description: '核对可用模块与当前残响。', effect: { sanityDelta: 0, overloadDelta: 1 } },
        { id: 'leave-shop', label: '保留残响并离开', description: '不在此处暴露更多记忆信息。', effect: { sanityDelta: 1, overloadDelta: -1 } },
      ],
    },
  ],
  'unknown': [
    {
      id: 'unknown-unresolved-signal',
      nodeType: 'unknown',
      title: '无法解析的信号',
      body: '路径尽头的信号被白噪声覆盖，终端只能确认风险等级，真实结构仍藏在雾后。',
      choices: [
        { id: 'scan-signal', label: '尝试解析信号', description: '在进入前寻找真实节点的轮廓。', effect: { sanityDelta: -1, overloadDelta: 4 } },
        { id: 'enter-unknown', label: '维持队形直接进入', description: '承担未知风险并保留行动节奏。', effect: { sanityDelta: -2, overloadDelta: 6 } },
      ],
    },
  ],
  'boss': [
    {
      id: 'boss-name-erasure',
      nodeType: 'boss',
      title: '被擦去姓名的核心',
      body: '记忆核心像一枚悬空的透明种子，内部排列着大量空白档案。每当迷迭香靠近，她自己的姓名也会从终端上淡去。',
      choices: [
        { id: 'resonate-core', label: '以共鸣巨剑稳定核心', description: '用已经找回的记忆重新建立自我坐标。', effect: { sanityDelta: -5, overloadDelta: 15 } },
        { id: 'recite-fragments', label: '逐一复述持有的记忆碎片', description: '以明确事实抵抗姓名消退。', effect: { sanityDelta: 4, overloadDelta: 4 } },
      ],
    },
    {
      id: 'boss-four-shadows',
      nodeType: 'boss',
      title: '四柄巨剑的影子',
      body: '核心周围投下四道不属于任何实体的剑影。它们指向不同的过去，并要求迷迭香承认其中只有一段是真实的。',
      choices: [
        { id: 'reject-choice', label: '拒绝替记忆划分真假', description: '保留矛盾，让核心自行显露接缝。', effect: { sanityDelta: -2, overloadDelta: 9 } },
        { id: 'align-shadows', label: '让四道剑影重新重合', description: '以共鸣校准彼此冲突的过去。', effect: { sanityDelta: -4, overloadDelta: 14 } },
        { id: 'anchor-name', label: '以自己的名字固定现实', description: '从最确定的事实开始重建边界。', effect: { sanityDelta: 5, overloadDelta: 5 } },
      ],
    },
  ],
};

export function selectPresetEvent(input: SelectPresetEventInput): {
  event: PresetEventDraft;
  randomState: SeededRandomState;
} {
  const pool = PRESET_EVENT_POOL[input.nodeType];
  const [draw, randomState] = randomInt(input.randomState, 0, pool.length - 1);
  const pressureOffset = input.overload >= 70 || input.sanity <= 40 ? 1 : 0;
  const fragmentOffset = input.fragments.length % pool.length;
  const nodeTypeOffset = input.nodeType === 'safehouse' ? 1 : 0;
  const template = pool[(draw + pressureOffset + fragmentOffset + nodeTypeOffset) % pool.length];
  const fragmentName = input.fragments.at(-1)?.name;
  const context = fragmentName
    ? `认知链路已用“${fragmentName}”完成本地校准。`
    : '未检测到可用于校准的普通记忆碎片。';

  return {
    event: {
      ...template,
      context,
      choices: template.choices.map((choice) => ({ ...choice, effect: { ...choice.effect } })),
    },
    randomState,
  };
}
