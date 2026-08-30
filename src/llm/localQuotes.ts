import type { GreatswordId, RuleEvent } from '../game/types';
import type { TemporaryQuoteContent } from './gameContent';

const swordLabels: Record<GreatswordId, string> = {
  breach: '破壁巨剑',
  watch: '守望巨剑',
  perception: '感知巨剑',
  resonance: '共鸣巨剑',
};

export function describeRuleEvent(event: RuleEvent): string {
  switch (event.type) {
    case 'check.resolved':
      return `${event.attribute}检定${event.outcome === 'failure' || event.outcome === 'critical-failure' ? '未通过' : '通过'}`;
    case 'greatsword.used':
      return `使用${swordLabels[event.swordId]}执行战术动作`;
    case 'fragment.acquired':
      return `取得${event.kind === 'core' ? '核心' : '普通'}记忆碎片`;
    case 'fragment.overflow':
      return '记忆碎片槽位溢出';
    case 'fragment.discarded':
      return '放弃新发现的记忆碎片';
    case 'fragment.replaced':
      return '遗忘旧碎片并装载新记忆';
    case 'run.moved':
      return '向新的迷宫节点移动';
    case 'node.completed':
      return '完成当前迷宫节点的解析';
    case 'economy.echoes-changed':
      return event.delta >= 0 ? '获得记忆残响' : '消耗记忆残响';
    case 'module.acquired':
      return '装载新的认知模块';
    case 'fragment.sold':
      return '将普通记忆碎片转化为残响';
    case 'run.ended':
      return event.result === 'victory' ? '成功逃离本层记忆迷宫' : '本次认知潜入中断';
  }
}

export function selectLocalQuote(
  event: RuleEvent,
  vitals: { sanity: number; overload: number },
): TemporaryQuoteContent {
  if (vitals.overload >= 85) return { text: '我听得见裂缝……请继续指挥我。' };
  if (vitals.overload >= 70) return { text: '我还能分清这里和记忆。' };

  switch (event.type) {
    case 'check.resolved':
      return { text: event.outcome === 'failure' || event.outcome === 'critical-failure'
        ? '我会再确认一次，不让它骗过去。'
        : '我看见判定留下的轨迹了。' };
    case 'greatsword.used':
      return { text: '我会让巨剑替我记住方向。' };
    case 'fragment.acquired':
      return { text: '我记得这块碎片的重量。' };
    case 'fragment.overflow':
    case 'fragment.discarded':
    case 'fragment.replaced':
      return { text: '我会选择该留下的那一段。' };
    case 'run.moved':
      return { text: '我会沿着这条路继续。' };
    case 'node.completed':
      return { text: '我已经把这个节点记下了。' };
    case 'economy.echoes-changed':
      return { text: '这些残响还能帮助我们继续。' };
    case 'module.acquired':
      return { text: '新回路已经接入，我能感觉到。' };
    case 'fragment.sold':
      return { text: '放下它，不代表我忘记了。' };
    case 'run.ended':
      return { text: event.result === 'victory'
        ? '我找到出口了，也找回了自己。'
        : '我需要停下，但记忆还在。' };
  }
}
