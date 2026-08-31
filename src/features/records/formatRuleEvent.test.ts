import type { RuleEvent } from '../../game/types';
import { formatRuleEvent } from './formatRuleEvent';

const cases: Array<{ event: RuleEvent; title: string; detail: string }> = [
  {
    event: { type: 'check.resolved', attribute: '认知', roll: 12, total: 15, difficulty: 14, outcome: 'success' },
    title: 'D20 检定完成',
    detail: '结果 15，难度 14',
  },
  {
    event: { type: 'greatsword.used', swordId: 'breach', actionPointCost: 1, overloadDelta: 6, cooldown: 1 },
    title: '破壁已执行',
    detail: '消耗 1 行动点，过载变化 +6',
  },
  { event: { type: 'fragment.acquired', fragmentId: 'memory-a', kind: 'emotion' }, title: '取得记忆碎片', detail: 'memory-a' },
  { event: { type: 'fragment.overflow', fragmentId: 'memory-b' }, title: '记忆槽位已满', detail: 'memory-b' },
  { event: { type: 'fragment.discarded', fragmentId: 'memory-c' }, title: '放弃记忆碎片', detail: 'memory-c' },
  {
    event: { type: 'fragment.replaced', forgottenFragmentId: 'memory-old', acquiredFragmentId: 'memory-new' },
    title: '替换记忆碎片',
    detail: 'memory-old → memory-new',
  },
  {
    event: { type: 'fragment.transcribed', fragmentId: 'memory-d', diaryDraftId: 'diary-a' },
    title: '记忆已抄录至手记',
    detail: 'memory-d',
  },
  {
    event: { type: 'run.moved', sourceNodeId: 'node-a', targetNodeId: 'node-b' },
    title: '进入新的迷宫节点',
    detail: 'node-a → node-b',
  },
  { event: { type: 'node.completed', nodeId: 'node-b' }, title: '节点结算完成', detail: 'node-b' },
  {
    event: { type: 'encounter.action-resolved', nodeId: 'node-b', actionType: 'play-sword' },
    title: '遭遇行动已结算',
    detail: 'node-b · play-sword',
  },
  {
    event: { type: 'comfort.used', gesture: 'hold-hand', actionPointCost: 1, overloadDelta: -12 },
    title: '陪伴交互已完成',
    detail: '消耗 1 行动点，过载变化 -12',
  },
  {
    event: { type: 'economy.echoes-changed', delta: 8, balance: 24 },
    title: '记忆残响已变更',
    detail: '+8，当前 24',
  },
  { event: { type: 'module.acquired', moduleId: 'memory-cache' }, title: '认知模块已装载', detail: 'memory-cache' },
  {
    event: { type: 'fragment.sold', fragmentId: 'memory-e', echoes: 10 },
    title: '记忆碎片已出售',
    detail: 'memory-e，获得 10 残响',
  },
  { event: { type: 'run.ended', result: 'victory' }, title: '成功逃离', detail: '本次探索已完成' },
];

test.each(cases)('formats $event.type as readable local text', ({ event, title, detail }) => {
  expect(formatRuleEvent(event, 2)).toEqual({
    id: 'rule-event-3',
    title,
    detail,
  });
});
