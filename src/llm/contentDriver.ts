import { getNodeDefinition } from '../game/nodeCatalog';
import type { MazeNode, RoguelikeState, RunState } from '../game/types';
import { getAllowedChoiceIds, isRegisteredModifier, REGISTERED_COMBAT_INTENT_IDS } from './gameplayRegistry';
import type { NodePresentation } from './schemas/gameDirectorV1';

export interface ContentDriverInput {
  run: RunState;
  node: MazeNode;
  state?: RoguelikeState;
}

export interface GameContentDriver {
  resolveNode(input: ContentDriverInput): NodePresentation | Promise<NodePresentation>;
}

const descriptions: Record<MazeNode['type'], string> = {
  combat: '残响实体阻断了前路。观察意图，再调配四柄巨剑。',
  'emergency-combat': '高威胁残响锁定了神经链路，必须谨慎分配行动点。',
  safehouse: '噪声在这里暂时减弱，可以恢复稳定或疏导过载。',
  shop: '认知黑市正在交换回响、模块与被遗忘的战术痕迹。',
  encounter: '一段无法归类的记忆正在回应迷迭香。',
  dilemma: '记忆要求付出代价，选择将改变这次潜入的构筑方向。',
  unknown: '信号内容尚未显形，真实节点已由本地规则预先锁定。',
  boss: '领袖残响守在本层出口，核心阶段将遵循本地战斗规则。',
};

const quotes: Record<MazeNode['type'], string> = {
  combat: '我会看清它的动作。',
  'emergency-combat': '我还能控制住这些剑。',
  safehouse: '我想在这里听一会儿你的声音。',
  shop: '这些回响，也曾经属于谁吗？',
  encounter: '这段记忆在等我靠近。',
  dilemma: '博士，我会记住自己的选择。',
  unknown: '我还看不清里面。',
  boss: '我不会再把自己关在这里。',
};

export class LocalContentDriver implements GameContentDriver {
  resolveNode({ run, node }: ContentDriverInput): NodePresentation {
    const definition = getNodeDefinition(node.type);
    const modifierIds = [...new Set([...definition.defaultModifiers, ...node.modifiers])].filter(isRegisteredModifier);
    const usesIntentPlan = node.type === 'combat' || node.type === 'emergency-combat';
    const offset = (node.depth + run.floor) % REGISTERED_COMBAT_INTENT_IDS.length;
    const intentIds = Array.from({ length: 3 }, (_, index) => (
      REGISTERED_COMBAT_INTENT_IDS[(offset + index) % REGISTERED_COMBAT_INTENT_IDS.length]
    ));
    return {
      version: 1,
      runId: run.id,
      nodeId: node.id,
      nodeType: node.type,
      source: 'local',
      title: definition.label,
      description: descriptions[node.type],
      choiceIds: [...getAllowedChoiceIds(node.type)],
      modifierIds,
      ...(usesIntentPlan ? { enemyPlan: { intentIds } } : {}),
      quote: quotes[node.type],
    };
  }
}
