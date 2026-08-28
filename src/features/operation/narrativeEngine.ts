import type { NarrativeEngine, NarrativeOutcome, UiPreferences } from '../../types/game';

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
  '小队重新确认队形，环境扫描线沿着走廊缓慢推进。',
  '医疗站的应急照明短暂熄灭，西侧隔离门后传来金属摩擦声。',
  '战术检定：当前指令可执行，未发现立即冲突。',
  '阿米娅要求所有成员保持通讯静默，等待下一次心智波动。',
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
