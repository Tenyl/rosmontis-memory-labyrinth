import { GREATSWORD_CONFIG } from '../../../game/greatswords';
import type { GreatswordId, MazeNodeType, RunAction } from '../../../game/types';

export type OfflineNarrativeTopic = 'inspect' | 'memory';

export type OfflineCommandResult =
  | { kind: 'action'; action: RunAction; label: string }
  | { kind: 'narrative'; topic: OfflineNarrativeTopic; label: string }
  | { kind: 'recovery'; message: string; suggestions: string[] };

const SWORD_COMMANDS: Array<{ swordId: GreatswordId; name: string; pattern: RegExp; label: string }> = [
  { swordId: 'breach', name: '破壁', pattern: /破壁|普通攻击|攻击/, label: '执行破壁攻击' },
  { swordId: 'watch', name: '守望', pattern: /守望|护盾|防御/, label: '展开守望阵位' },
  { swordId: 'perception', name: '认知', pattern: /认知|扫描|侦测/, label: '执行认知侦测' },
  { swordId: 'resonance', name: '共鸣', pattern: /共鸣|精神爆发/, label: '稳定记忆共鸣' },
];

const RECOVERY_SUGGESTIONS: Record<MazeNodeType, string[]> = {
  combat: ['使用破壁攻击', '展开守望护盾', '检查残响实体'],
  'emergency-combat': ['使用破壁攻击', '展开守望护盾', '检查高威胁词条'],
  encounter: ['认知侦测奇境', '展开守望护盾', '检查环境异常'],
  dilemma: ['读取抉择代价', '展开守望护盾', '检查记忆蜕变'],
  safehouse: ['让迷迭香短暂休整', '展开守望护盾', '读取残留意识'],
  shop: ['检查认知黑市库存', '核对记忆残响', '离开交易终端'],
  unknown: ['认知侦测未知信号', '展开守望护盾', '评估风险等级'],
  boss: ['与记忆核心共鸣', '展开守望护盾', '检查核心结构'],
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
    return { kind: 'action', action: { type: 'apply-vitals', sanityDelta: 8, overloadDelta: -12 }, label: '执行认知休整' };
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
      action: { type: 'use-greatsword', action: { swordId: swordCommand.swordId, target: config.target, nodeType } },
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
