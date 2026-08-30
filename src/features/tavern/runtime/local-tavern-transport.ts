import { abortError, type TavernTransport, type TavernTransportRequest } from './tavern-transport';
import { selectPresetEvent, type PresetEventDraft } from '../../../game/presetEvents';

interface LocalTavernTransportOptions {
  delayMs?: number;
}

const LOCAL_RESPONSE_CHUNKS = [
  '<thinking>门牌编号与病历索引存在重复，优先确认声音来源。</thinking>',
  '<maintext>迷迭香抬起手，雨滴在她身前三厘米处停住。走廊尽头的金属门牌从 R-08 缓慢翻转为 R-09，',
  '门后传来三个频率完全相同的呼吸声。她没有继续靠近，只在地面标出一道浅蓝色的安全线。</maintext>',
  '<option>检查门牌背面的刻痕\n让医疗组比对呼吸频率\n沿安全线建立感知锚点</option>',
  '<sum>R-09 门后出现三个同步意识回声，迷迭香建立临时安全线。</sum>',
  '<vars>{"rosmontis_stress":43,"sanity":59,"risk":"A","objective":"确认 R-09 门后的同步意识回声","clue_title":"反复翻转的 R-09 门牌"}</vars>',
] as const;

export class LocalTavernTransport implements TavernTransport {
  readonly mode = 'local' as const;
  private readonly delayMs: number;

  constructor(options: LocalTavernTransportOptions = {}) {
    this.delayMs = options.delayMs ?? 65;
  }

  async *stream(request: TavernTransportRequest, signal: AbortSignal): AsyncIterable<string> {
    const chunks = request.offlineContext
      ? buildPresetEventChunks(selectPresetEvent(request.offlineContext).event, request.offlineContext)
      : LOCAL_RESPONSE_CHUNKS;
    for (const chunk of chunks) {
      await waitForDelay(this.delayMs, signal);
      if (signal.aborted) throw abortError();
      yield chunk;
    }
  }
}

function buildPresetEventChunks(event: PresetEventDraft, context: NonNullable<TavernTransportRequest['offlineContext']>) {
  const isOpeningEvent = event.id === 'rest-r09-breathing';
  const summary = isOpeningEvent
    ? 'R-09 门后出现三个同步意识回声，迷迭香建立临时安全线。'
    : `${event.title}已完成本地事件建模，等待玩家选择处理方式。`;
  const objective = isOpeningEvent
    ? '确认 R-09 门后的同步意识回声'
    : `处理记忆事件：${event.title}`;
  const variables = {
    rosmontis_stress: isOpeningEvent ? 43 : context.overload,
    sanity: isOpeningEvent ? 59 : context.sanity,
    risk: context.overload >= 70 ? 'S' : context.overload >= 45 ? 'A' : 'B',
    objective,
    clue_title: event.title,
  };

  return [
    `<thinking>本地预设事件已按 Run 种子与当前认知状态选定：${event.title}。</thinking>`,
    `<maintext>${event.title}\n${event.body}\n${event.context}</maintext>`,
    `<option>${event.choices.map((choice) => choice.label).join('\n')}</option>`,
    `<sum>${summary}</sum>`,
    `<vars>${JSON.stringify(variables)}</vars>`,
  ];
}

function waitForDelay(delayMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(abortError());
  if (delayMs === 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(abortError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
