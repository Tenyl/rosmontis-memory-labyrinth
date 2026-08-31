import { ArrowLeft, LockKeyhole } from 'lucide-react';
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
import { NodeSettlement } from './NodeSettlement';

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
  const combatNode = props.encounter?.kind === 'combat' || props.encounter?.kind === 'boss';
  const actions = <GreatswordActions
    rosmontis={props.rosmontis}
    currentNodeType={props.node.type}
    encounter={props.encounter}
    explorationCharges={props.explorationCharges}
    ruleLog={props.ruleLog}
    onAction={props.onAction}
  />;
  const encounterPanel = <EncounterPanel
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
  />;

  return (
    <section className="node-scene" data-node-type={props.node.type} aria-labelledby="game-node-scene-title">
      <header className="node-scene-header">
        <div>
          <span>{nodeName} / RISK {props.node.risk}</span>
          <h2 id="game-node-scene-title" tabIndex={-1}>{nodeName}</h2>
          <p>{props.brief?.description ?? `迷迭香正在处理第 ${props.node.floor} 层、深度 ${props.node.depth} 的记忆节点。`}</p>
        </div>
        <div className="node-scene-header-actions">
          <strong>{props.brief?.title ?? props.node.id}</strong>
          <button
            id="game-return-to-maze"
            className="terminal-button is-primary node-scene-return"
            type="button"
            disabled={unresolved || !props.encounter}
            onClick={props.onReturnToMaze}
          >
            {unresolved ? <LockKeyhole size={17} aria-hidden /> : <ArrowLeft size={17} aria-hidden />}
            {unresolved ? '完成当前节点后返回' : '返回迷宫'}
          </button>
        </div>
      </header>

      {props.encounter?.resolved ? (
        <NodeSettlement
          encounter={props.encounter}
          sanity={props.rosmontis.sanity}
          overload={props.rosmontis.overload}
          echoes={props.echoes}
          fragmentCount={props.inventory.fragments.length + props.inventory.coreFragments.length}
          canAdvanceFloor={props.canAdvanceFloor}
          onAdvanceFloor={props.onAdvanceFloor}
        />
      ) : (
        <>
          {combatNode ? <>{encounterPanel}{actions}</> : <>{actions}{encounterPanel}</>}
          <ModuleInventory modules={props.modules} />
          <LlmEventDirector />
          <TavernGameView />
        </>
      )}
    </section>
  );
}
