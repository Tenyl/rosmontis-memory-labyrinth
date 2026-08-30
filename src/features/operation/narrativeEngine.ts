import { GREATSWORD_CONFIG } from '../../game/greatswords';
import type { GreatswordId, MazeNodeType, RunAction } from '../../game/types';
import type { NarrativeEngine, NarrativeOutcome, UiPreferences } from '../../types/game';

export type OfflineNarrativeTopic = 'inspect' | 'memory';

export type OfflineCommandResult =
  | { kind: 'action'; action: RunAction; label: string }
  | { kind: 'narrative'; topic: OfflineNarrativeTopic; label: string }
  | { kind: 'recovery'; message: string; suggestions: string[] };

const SWORD_COMMANDS: Array<{ swordId: GreatswordId; name: string; pattern: RegExp; label: string }> = [
  { swordId: 'breach', name: '破壁', pattern: /破壁|普通攻击|攻击/, label: '执行破壁攻击' },
  { swordId: 'watch', name: '守望', pattern: /守望|护盾|防御/, label: '展开守望阵位' },
  { swordId: 'perception', name: '感知', pattern: /感知|扫描|侦测/, label: '执行战术感知' },
  { swordId: 'resonance', name: '共鸣', pattern: /共鸣|精神爆发/, label: '稳定记忆共鸣' },
];

const RECOVERY_SUGGESTIONS: Record<MazeNodeType, string[]> = {
  'echo-combat': ['使用破壁攻击', '展开守望护盾', '检查残响实体'],
  'blank-event': ['扫描空白断层', '展开守望护盾', '检查环境异常'],
  'thought-rest': ['让迷迭香短暂休整', '展开守望护盾', '读取残留意识'],
  'memory-core': ['与记忆核心共鸣', '展开守望护盾', '检查核心结构'],
};

export function classifyOfflineCommand(command: string, nodeType: MazeNodeType): OfflineCommandResult {
  const normalized = command.trim().replace(/\s+/g, '');
  if (!normalized) {
    return { kind: 'recovery', message: '未识别到可执行的离线指令。', suggestions: [...RECOVERY_SUGGESTIONS[nodeType]] };
  }

  if (/稳定.*核心|固定.*核心/.test(normalized)) {
    return { kind: 'action', action: { type: 'stabilize-core' }, label: '稳定记忆核心' };
  }
  if (/完成.*节点|回收.*记忆碎片|收集.*记忆碎片/.test(normalized)) {
    return { kind: 'action', action: { type: 'complete-node' }, label: '完成当前节点' };
  }
  if (/休整|稳定呼吸|深呼吸/.test(normalized)) {
    return {
      kind: 'action',
      action: { type: 'apply-vitals', sanityDelta: 8, overloadDelta: -12 },
      label: '执行认知休整',
    };
  }

  const swordCommand = SWORD_COMMANDS.find(({ pattern }) => pattern.test(normalized));
  if (swordCommand) {
    const config = GREATSWORD_CONFIG[swordCommand.swordId];
    if (!config.nodeTypes.includes(nodeType)) {
      return {
        kind: 'recovery',
        message: `当前节点不能使用${swordCommand.name}，请选择与节点类型匹配的行动。`,
        suggestions: [...RECOVERY_SUGGESTIONS[nodeType]],
      };
    }
    return {
      kind: 'action',
      action: {
        type: 'use-greatsword',
        action: { swordId: swordCommand.swordId, target: config.target, nodeType },
      },
      label: swordCommand.label,
    };
  }

  if (/残留意识|读取.*记忆|回忆/.test(normalized)) {
    return { kind: 'narrative', topic: 'memory', label: '读取残留意识' };
  }
  if (/检查|调查|观察|探索|靠近|比对|确认|请求|进入|返回|继续|深入|连接|呼叫/.test(normalized)) {
    return { kind: 'narrative', topic: 'inspect', label: '执行环境调查' };
  }

  return {
    kind: 'recovery',
    message: '未识别到与当前节点对应的离线指令，请改用建议行动。',
    suggestions: [...RECOVERY_SUGGESTIONS[nodeType]],
  };
}

export interface NarrativeScheduler {
  schedule(callback: () => void, delayMs: number): ReturnType<typeof setTimeout>;
  cancel(handle: ReturnType<typeof setTimeout>): void;
}

const defaultScheduler: NarrativeScheduler = {
  schedule: (callback, delayMs) => setTimeout(callback, delayMs),
  cancel: (handle) => clearTimeout(handle),
};

const memoryChunks = [
  '迷迭香闭上眼睛，四台战术装备在她身后缓慢失去重量。',
  '墙内的雨声被拉成细长的银线，一段并不属于建筑本身的走廊开始显形。',
  '感知检定：16 + 2，难度 15，判定成功。',
  '她听见墙体后的儿童合唱——每一个声音都停留在同一个凌晨 03:17。',
  '新的深层路径已经建立，但回流的记忆令精神负荷显著上升。',
];

const genericChunks = [
  '迷迭香重新确认四柄巨剑的位置，环境扫描线沿着走廊缓慢推进。',
  '医疗站的应急照明短暂熄灭，西侧隔离门后传来金属摩擦声。',
  '战术检定：当前指令可执行，未发现立即冲突。',
  '她主动降低神经链路带宽，保持通讯静默并等待下一次心智波动。',
  '局势已更新，相关变化同步写入行动记录。',
];

const outcome: NarrativeOutcome = {
  entryId: 'narrative-check-09',
  checkTotal: 18,
  operatorStress: 57,
  unlockedNodeId: 'memory-deep-chorus',
  archiveRecordId: 'archive-deep-chorus',
};

const timingBySpeed: Record<UiPreferences['textSpeed'], { initial: number; chunk: number }> = {
  instant: { initial: 0, chunk: 0 },
  standard: { initial: 120, chunk: 180 },
  immersive: { initial: 300, chunk: 520 },
};

export function createLocalNarrativeEngine(
  scheduler: NarrativeScheduler = defaultScheduler,
  textSpeed: UiPreferences['textSpeed'] = 'standard',
): NarrativeEngine {
  let activeHandle: ReturnType<typeof setTimeout> | null = null;
  let paused = false;
  let cancelled = false;
  let resumeCurrent: (() => void) | null = null;
  const timing = timingBySpeed[textSpeed];

  const cancelHandle = () => {
    if (activeHandle !== null) scheduler.cancel(activeHandle);
    activeHandle = null;
  };

  return {
    run(command, onChunk) {
      cancelHandle();
      paused = false;
      cancelled = false;
      resumeCurrent = null;
      const chunks = command.includes('残留意识') ? memoryChunks : genericChunks;

      return new Promise<NarrativeOutcome>((resolve, reject) => {
        let index = 0;

        const emitNext = () => {
          if (cancelled) {
            reject(new Error('本地叙事生成已取消'));
            return;
          }
          if (paused) {
            resumeCurrent = emitNext;
            return;
          }
          if (index >= chunks.length) {
            activeHandle = null;
            resumeCurrent = null;
            resolve({ ...outcome });
            return;
          }

          onChunk(chunks[index]);
          index += 1;
          activeHandle = scheduler.schedule(emitNext, timing.chunk);
        };

        activeHandle = scheduler.schedule(emitNext, timing.initial);
      });
    },
    pause() {
      paused = true;
    },
    resume() {
      if (!paused) return;
      paused = false;
      const continuation = resumeCurrent;
      resumeCurrent = null;
      continuation?.();
    },
    cancel() {
      cancelled = true;
      paused = false;
      cancelHandle();
      resumeCurrent?.();
      resumeCurrent = null;
    },
  };
}
