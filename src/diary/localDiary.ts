import type { DiaryDraft } from '../game/types';
import type { DiarySnapshot, LocalDiaryTrigger } from './types';

export function createLocalDiaryDraft(trigger: LocalDiaryTrigger, snapshot: DiarySnapshot): DiaryDraft {
  const triggerKey = createTriggerKey(trigger, snapshot.runId);
  const status = snapshot.overload >= 80
    ? '脑海里的声音还很吵，但博士握住了我的方向。'
    : snapshot.sanity <= 35
      ? '我有些累，却还记得博士让我慢一点呼吸。'
      : '我还能清楚地听见博士，所以没有独自停在这里。';

  if (trigger.type === 'boss-completed') {
    return draft(triggerKey, `守门残响消散以后`, `我让“${trigger.bossTitle}”安静下来了。${status}`, snapshot);
  }
  if (trigger.type === 'floor-completed') {
    return draft(triggerKey, `第${toChineseNumber(trigger.floor)}层也会成为过去`, `我离开了第${trigger.floor}层“${trigger.floorTitle}”。${status}`, snapshot);
  }
  return draft(triggerKey, `请替我记住：${trigger.fragmentName}`, `我暂时放下了“${trigger.fragmentName}”，但博士会替我记住，所以它没有真正消失。`, snapshot);
}

function createTriggerKey(trigger: LocalDiaryTrigger, runId: string): string {
  if (trigger.type === 'boss-completed') return `boss-completed:${runId}:${trigger.nodeId}`;
  if (trigger.type === 'floor-completed') return `floor-completed:${runId}:${trigger.floor}`;
  return `fragment-transcribed:${trigger.fragmentId}`;
}

function draft(triggerKey: string, title: string, body: string, snapshot: DiarySnapshot): DiaryDraft {
  return {
    id: `diary-${stableHash(triggerKey)}`,
    triggerKey,
    title,
    body,
    source: 'local',
    createdAt: 'pending-write',
    runId: snapshot.runId,
    floor: snapshot.floor,
  };
}

function toChineseNumber(value: number): string {
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (value < 10) return digits[value];
  if (value < 20) return `十${value % 10 ? digits[value % 10] : ''}`;
  return String(value);
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
