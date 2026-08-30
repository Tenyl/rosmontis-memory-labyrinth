import { PageHeader } from '../../components/PageHeader';
import { useGameStore } from '../../store/gameStore';
import { TavernGameView } from '../tavern/game/TavernGameView';
import { useTavern } from '../tavern/runtime/useTavern';
import { FragmentOverflowDialog } from './FragmentOverflowDialog';
import { GreatswordActions } from './GreatswordActions';
import { LlmEventDirector } from './LlmEventDirector';
import { NodeResolutionPanel } from './NodeResolutionPanel';
import { NovelRunDirector } from './NovelRunDirector';
import { RunLifecycleDialog } from './RunLifecycleDialog';
import { RunStatusBar } from './RunStatusBar';
import { RosmontisQuotePanel } from './RosmontisQuotePanel';
import { TacticalOverview } from './TacticalOverview';
import './operation.css';

export default function OperationPage() {
  const runtime = useTavern();
  const session = useGameStore((state) => state.session);
  const rosmontis = useGameStore((state) => state.operators.byId.rosmontis);
  const run = useGameStore((state) => state.run);
  const runRosmontis = useGameStore((state) => state.rosmontis);
  const progression = useGameStore((state) => state.progression);
  const maze = useGameStore((state) => state.maze);
  const ruleLog = useGameStore((state) => state.ruleLog);
  const useGreatsword = useGameStore((state) => state.useGreatsword);
  const memoryInventory = useGameStore((state) => state.memoryInventory);
  const completeCurrentNode = useGameStore((state) => state.completeCurrentNode);
  const resolveFragmentChoice = useGameStore((state) => state.resolveFragmentChoice);
  const startRun = useGameStore((state) => state.startRun);
  const resetRun = useGameStore((state) => state.resetRun);
  const stabilizeMemoryCore = useGameStore((state) => state.stabilizeMemoryCore);
  const currentNode = maze.nodes.find((node) => node.id === run.currentNodeId) ?? maze.nodes[0];
  const llmEnabled = Boolean(runtime.settings?.api.apiKey.trim());

  return (
    <section className="route-page operation-route" aria-labelledby="operation-page-title">
      <PageHeader
        id="operation-page-title"
        code="01"
        title="作战主控台"
        description="解析剧情、执行战术指令并监控迷迭香状态。所有本地模拟与远程模型回合均经统一 Tavern 运行时解析并持久化。"
        meta="LIVE SESSION / 03:31"
      />

      <RunLifecycleDialog
        run={run}
        progression={progression}
        llmEnabled={llmEnabled}
        currentNodeIsCore={currentNode.type === 'boss'}
        coreStability={runRosmontis.coreStability}
        onStart={startRun}
        onReset={resetRun}
        onStabilize={stabilizeMemoryCore}
      />

      <NovelRunDirector />

      <RunStatusBar run={run} rosmontis={runRosmontis} progression={progression} />
      <RosmontisQuotePanel />

      <div className="operation-workbench">
        <div className="operation-primary">
          <GreatswordActions
            rosmontis={runRosmontis}
            currentNodeType={currentNode.type}
            ruleLog={ruleLog}
            onUse={useGreatsword}
          />
          <NodeResolutionPanel
            run={run}
            node={currentNode}
            ruleLog={ruleLog}
            onComplete={completeCurrentNode}
          />
          <LlmEventDirector />
          <TavernGameView />
        </div>
        <TacticalOverview session={session} rosmontis={rosmontis} />
      </div>

      <FragmentOverflowDialog inventory={memoryInventory} onResolve={resolveFragmentChoice} />
    </section>
  );
}
