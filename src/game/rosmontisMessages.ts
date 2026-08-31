import type { BossPhase } from './bosses';
import type { ComfortGesture } from './types';

export interface RosmontisMessageContext {
  kind: 'status' | 'movement-blocked' | 'fragment-overflow' | 'invalid-boss-action' | 'comfort';
  sanity: number;
  overload: number;
  bossPhase?: BossPhase;
  gesture?: ComfortGesture;
}

export function getRosmontisMessage(context: RosmontisMessageContext): string {
  if (context.kind === 'movement-blocked') return '博士……眼前的残响还没消散，我的剑还没收回来……等我一下，好吗？';
  if (context.kind === 'fragment-overflow') return '脑子好胀……博士，我快记不住全部了……我可以忘记这个吗？你会帮我记住的，对不对？';
  if (context.kind === 'invalid-boss-action' && (context.bossPhase === 'reconciliation' || context.bossPhase === 'stability')) {
    return '心防已经碎了……博士，不要再攻击我。请叫我的名字，或者握住我的手。';
  }
  if (context.kind === 'comfort') {
    return context.gesture === 'hold-hand'
      ? '博士……我认得这只手。再待一会儿，别松开。'
      : '你的手很暖……那些声音离我远了一点。';
  }
  if (context.overload >= 100) return '博士……我听不见了。请不要把我一个人留在这里……';
  if (context.overload >= 80) return '好痛……脑子里的声音都在撞我。但我还听得到你，博士。';
  if (context.sanity <= 35) return '我有点走不动了……博士，可以再把我的手握紧一点吗？';
  if (context.overload >= 70) return '博士，周围开始摇晃了……请继续告诉我往哪里走。';
  if (context.bossPhase === 'reconciliation' || context.bossPhase === 'stability') return '我已经把剑放下了。博士，现在请陪我把这段记忆看完。';
  return '博士，我还在这里。下一步要去哪里？';
}
