import { GREATSWORD_NAMES } from '../../game/terminology';
import type { RuleEvent } from '../../game/types';

export interface ReadableRuleEvent {
  id: string;
  title: string;
  detail: string;
}

export function formatRuleEvent(event: RuleEvent, index: number): ReadableRuleEvent {
  const id = `rule-event-${index + 1}`;

  switch (event.type) {
    case 'check.resolved':
      return { id, title: 'D20 检定完成', detail: `结果 ${event.total}，难度 ${event.difficulty}` };
    case 'greatsword.used':
      return {
        id,
        title: `${GREATSWORD_NAMES[event.swordId]}已执行`,
        detail: `消耗 ${event.actionPointCost} 行动点，过载变化 ${signed(event.overloadDelta)}`,
      };
    case 'fragment.acquired':
      return { id, title: '取得记忆碎片', detail: event.fragmentId };
    case 'fragment.overflow':
      return { id, title: '记忆槽位已满', detail: event.fragmentId };
    case 'fragment.discarded':
      return { id, title: '放弃记忆碎片', detail: event.fragmentId };
    case 'fragment.replaced':
      return { id, title: '替换记忆碎片', detail: `${event.forgottenFragmentId} → ${event.acquiredFragmentId}` };
    case 'fragment.transcribed':
      return { id, title: '记忆已抄录至手记', detail: event.fragmentId };
    case 'run.moved':
      return { id, title: '进入新的迷宫节点', detail: `${event.sourceNodeId} → ${event.targetNodeId}` };
    case 'node.completed':
      return { id, title: '节点结算完成', detail: event.nodeId };
    case 'encounter.action-resolved':
      return { id, title: '遭遇行动已结算', detail: `${event.nodeId} · ${event.actionType}` };
    case 'comfort.used':
      return {
        id,
        title: '陪伴交互已完成',
        detail: `消耗 ${event.actionPointCost} 行动点，过载变化 ${signed(event.overloadDelta)}`,
      };
    case 'economy.echoes-changed':
      return { id, title: '记忆残响已变更', detail: `${signed(event.delta)}，当前 ${event.balance}` };
    case 'module.acquired':
      return { id, title: '认知模块已装载', detail: event.moduleId };
    case 'fragment.sold':
      return { id, title: '记忆碎片已出售', detail: `${event.fragmentId}，获得 ${event.echoes} 残响` };
    case 'run.ended':
      return {
        id,
        title: event.result === 'victory' ? '成功逃离' : '认知链路中断',
        detail: event.result === 'victory' ? '本次探索已完成' : '本次探索被迫终止',
      };
    default:
      return assertNever(event);
  }
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function assertNever(_value: never): never {
  throw new Error('存在尚未适配的规则事件');
}
