import { ArrowLeft } from 'lucide-react';
import { NODE_TYPE_NAMES } from '../../game/terminology';
import type {
  EncounterAction,
  ExplorationCharges,
  GreatswordCombatState,
  MazeNode,
  MemoryInventory,
  ModuleId,
  PendingEncounter,
  RuleEvent,
} from '../../game/types';
import type { NovelNodeBrief } from '../../llm/gameContent';
import { EncounterPanel } from '../operation/EncounterPanel';
import { GreatswordActions } from '../operation/GreatswordActions';
import { LlmEventDirector } from '../operation/LlmEventDirector';
import { ModuleInventory } from '../operation/ModuleInventory';
import { TavernGameView } from '../tavern/game/TavernGameView';

interface NodeSceneProps {
  node: MazeNode;
  brief?: NovelNodeBrief;
  encounter: PendingEncounter | null;
  rosmontis: GreatswordCombatState;
  explorationCharges: ExplorationCharges;
  ruleLog: RuleEvent[];
  inventory: MemoryInventory;
  echoes: number;
  modules: ModuleId[];
  resonanceActive: boolean;
  canAdvanceFloor: boolean;
  onResolve: (choiceId: string) => void;
  onAction: (action: EncounterAction) => void;
  onSellFragment: (fragmentId: string) => void;
  onAdvanceFloor: () => void;
  onReturnToMaze: () => void;
}

export function NodeScene(props: NodeSceneProps) {
  const nodeName = NODE_TYPE_NAMES[props.node.type];
  const unresolved = Boolean(props.encounter && !props.encounter.resolved);

  return (
    <section className="node-scene" data-node-type={props.node.type} aria-labelledby="game-node-scene-title">
      <header className="node-scene-header">
        <div>
          <span>{nodeName} / RISK {props.node.risk}</span>
          <h2 id="game-node-scene-title" tabIndex={-1}>{nodeName}</h2>
          <p>{props.brief?.description ?? `迷迭香正在处理第 ${props.node.floor} 层、深度 ${props.node.depth} 的记忆节点。`}</p>
        </div>
        <strong>{props.brief?.title ?? props.node.id}</strong>
      </header>

      <GreatswordActions
        rosmontis={props.rosmontis}
        currentNodeType={props.node.type}
        encounter={props.encounter}
        explorationCharges={props.explorationCharges}
        ruleLog={props.ruleLog}
        onAction={props.onAction}
      />
      <EncounterPanel
        encounter={props.encounter}
        inventory={props.inventory}
        echoes={props.echoes}
        modules={props.modules}
        resonanceActive={props.resonanceActive}
        onResolve={props.onResolve}
        onAction={props.onAction}
        onSellFragment={props.onSellFragment}
        onAdvanceFloor={props.onAdvanceFloor}
        canAdvanceFloor={props.canAdvanceFloor}
        actionPoints={props.rosmontis.actionPoints}
      />
      <ModuleInventory modules={props.modules} />
      <LlmEventDirector />
      <TavernGameView />

      <footer className="node-scene-footer">
        <p>{unresolved ? '博士……眼前的残响还没消散，我的剑还没收回来……等我一下，好吗？' : '这里已经安静下来了。博士，我们回到迷宫里吧。'}</p>
        <button id="game-return-to-maze" className="terminal-button is-primary" type="button" disabled={unresolved || !props.encounter} onClick={props.onReturnToMaze}>
          <ArrowLeft size={17} aria-hidden />返回迷宫
        </button>
      </footer>
    </section>
  );
}
