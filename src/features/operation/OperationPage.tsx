import { useEffect } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useGameStore } from '../../store/gameStore';
import { TavernGameView } from '../tavern/game/TavernGameView';
import { useTavern } from '../tavern/runtime/useTavern';
import { FragmentOverflowDialog } from './FragmentOverflowDialog';
import { GreatswordActions } from './GreatswordActions';
import { LlmEventDirector } from './LlmEventDirector';
import { ModuleInventory } from './ModuleInventory';
import { NovelRunDirector } from './NovelRunDirector';
import { RunLifecycleDialog } from './RunLifecycleDialog';
import { RunStatusBar } from './RunStatusBar';
import { RosmontisQuotePanel } from './RosmontisQuotePanel';
import { TacticalOverview } from './TacticalOverview';
import { CompanionInteractionBar } from './CompanionInteractionBar';
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
  const resolveEncounterAction = useGameStore((state) => state.resolveEncounterAction);
  const memoryInventory = useGameStore((state) => state.memoryInventory);
  const economy = useGameStore((state) => state.economy);
  const modules = useGameStore((state) => state.modules);
  const explorationCharges = useGameStore((state) => state.explorationCharges);
  const routeEffects = useGameStore((state) => state.routeEffects);
  const pendingEncounter = useGameStore((state) => state.pendingEncounter);
  const beginCurrentEncounter = useGameStore((state) => state.beginCurrentEncounter);
  const resolveEncounterChoice = useGameStore((state) => state.resolveEncounterChoice);
  const sellRunFragment = useGameStore((state) => state.sellRunFragment);
  const advanceRunFloor = useGameStore((state) => state.advanceRunFloor);
  const continueToMindsea = useGameStore((state) => state.continueToMindsea);
  const resolveFragmentChoice = useGameStore((state) => state.resolveFragmentChoice);
  const startRun = useGameStore((state) => state.startRun);
  const resetRun = useGameStore((state) => state.resetRun);
  const stabilizeMemoryCore = useGameStore((state) => state.stabilizeMemoryCore);
  const currentNode = maze.nodes.find((node) => node.id === run.currentNodeId) ?? maze.nodes[0];
  const llmEnabled = Boolean(runtime.settings?.api.apiKey.trim());

  useEffect(() => {
    if (run.phase === 'exploring' && !pendingEncounter) beginCurrentEncounter();
  }, [beginCurrentEncounter, pendingEncounter, run.currentNodeId, run.phase]);

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
        onContinueMindsea={() => continueToMindsea(llmEnabled)}
      />

      <NovelRunDirector />

      <RunStatusBar
        run={run}
        rosmontis={runRosmontis}
        progression={progression}
        echoes={economy.echoes}
        scoutPoints={economy.scoutPoints}
        moduleCount={modules.length}
      />
      <RosmontisQuotePanel />
      <CompanionInteractionBar
        rosmontis={runRosmontis}
        bossPhase={pendingEncounter?.kind === 'boss' ? pendingEncounter.phase : null}
        onAction={resolveEncounterAction}
      />

      <div className="operation-workbench">
        <div className="operation-primary">
          <GreatswordActions
            rosmontis={runRosmontis}
            currentNodeType={currentNode.type}
            encounter={pendingEncounter}
            explorationCharges={explorationCharges}
            ruleLog={ruleLog}
            onAction={resolveEncounterAction}
          />
          <EncounterPanel
            encounter={pendingEncounter}
            inventory={memoryInventory}
            echoes={economy.echoes}
            modules={modules}
            resonanceActive={routeEffects.resonanceActive}
            onResolve={resolveEncounterChoice}
            onAction={resolveEncounterAction}
            onSellFragment={sellRunFragment}
            onAdvanceFloor={advanceRunFloor}
            actionPoints={runRosmontis.actionPoints}
            canAdvanceFloor={Boolean(
              pendingEncounter?.resolved
              && currentNode.id === maze.coreNodeId
              && run.floor < run.maxFloor
            )}
          />
          <ModuleInventory modules={modules} />
          <LlmEventDirector />
          <TavernGameView />
        </div>
        <TacticalOverview session={session} rosmontis={rosmontis} />
      </div>

      <FragmentOverflowDialog inventory={memoryInventory} onResolve={resolveFragmentChoice} />
    </section>
  );
}
import { EncounterPanel } from './EncounterPanel';
