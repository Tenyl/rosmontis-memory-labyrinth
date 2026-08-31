import { useEffect, useReducer } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useGameStore } from '../../store/gameStore';
import { FragmentOverflowDialog } from '../operation/FragmentOverflowDialog';
import { NovelRunDirector } from '../operation/NovelRunDirector';
import { RunLifecycleDialog } from '../operation/RunLifecycleDialog';
import { NovelMazeBrief } from '../memory/NovelMazeBrief';
import { useTavern } from '../tavern/runtime/useTavern';
import { GameHud } from './GameHud';
import { MazeStage } from './MazeStage';
import { NodeScene } from './NodeScene';
import { RosmontisPresence } from './RosmontisPresence';
import { gameSceneReducer, restoreGameSceneState } from './sceneState';
import '../operation/operation.css';
import '../memory/memory.css';
import './game.css';

export default function GamePage() {
  const runtime = useTavern();
  const run = useGameStore((state) => state.run);
  const maze = useGameStore((state) => state.maze);
  const rosmontis = useGameStore((state) => state.rosmontis);
  const progression = useGameStore((state) => state.progression);
  const ruleLog = useGameStore((state) => state.ruleLog);
  const inventory = useGameStore((state) => state.memoryInventory);
  const economy = useGameStore((state) => state.economy);
  const modules = useGameStore((state) => state.modules);
  const explorationCharges = useGameStore((state) => state.explorationCharges);
  const routeEffects = useGameStore((state) => state.routeEffects);
  const pendingEncounter = useGameStore((state) => state.pendingEncounter);
  const novel = useGameStore((state) => state.llmDirector.novel);
  const viewMode = useGameStore((state) => state.memoryMap.viewMode);
  const moveToNode = useGameStore((state) => state.moveToNode);
  const setMemoryView = useGameStore((state) => state.setMemoryView);
  const useExplorationPower = useGameStore((state) => state.useExplorationPower);
  const spendScoutPoint = useGameStore((state) => state.spendScoutPoint);
  const beginCurrentEncounter = useGameStore((state) => state.beginCurrentEncounter);
  const resolveEncounterChoice = useGameStore((state) => state.resolveEncounterChoice);
  const resolveEncounterAction = useGameStore((state) => state.resolveEncounterAction);
  const sellRunFragment = useGameStore((state) => state.sellRunFragment);
  const advanceRunFloor = useGameStore((state) => state.advanceRunFloor);
  const continueToMindsea = useGameStore((state) => state.continueToMindsea);
  const resolveFragmentChoice = useGameStore((state) => state.resolveFragmentChoice);
  const startRun = useGameStore((state) => state.startRun);
  const resetRun = useGameStore((state) => state.resetRun);
  const stabilizeMemoryCore = useGameStore((state) => state.stabilizeMemoryCore);
  const [scene, dispatchScene] = useReducer(gameSceneReducer, pendingEncounter, restoreGameSceneState);
  const currentNode = maze.nodes.find((node) => node.id === run.currentNodeId) ?? maze.nodes[0];
  const currentBrief = run.mode === 'novel'
    ? novel?.content.nodeBriefs.find((brief) => brief.nodeId === currentNode.id)
    : undefined;
  const llmEnabled = Boolean(runtime.settings?.api.apiKey.trim());

  useEffect(() => {
    if (run.phase === 'exploring' && !pendingEncounter) beginCurrentEncounter();
  }, [beginCurrentEncounter, pendingEncounter, run.currentNodeId, run.phase]);

  useEffect(() => {
    if (pendingEncounter && !pendingEncounter.resolved) {
      dispatchScene({ type: 'open-node', nodeId: pendingEncounter.nodeId });
    }
  }, [pendingEncounter]);

  const returnToMaze = () => {
    dispatchScene({ type: 'settle-node' });
    dispatchScene({ type: 'request-map' });
    dispatchScene({ type: 'finish-return' });
  };

  const showMap = scene.phase === 'map' || scene.phase === 'entering-node' || scene.phase === 'returning-map';

  return (
    <section className="route-page game-route" aria-labelledby="game-page-title">
      <PageHeader
        id="game-page-title"
        code="01"
        title="迷迭香的记忆迷宫"
        description="在同一战术工作区观察状态、选择路径并陪伴迷迭香处理每一个记忆节点。"
        meta={`FLOOR ${String(run.floor).padStart(2, '0')} / ${run.mode.toUpperCase()}`}
      />

      <RunLifecycleDialog
        run={run}
        progression={progression}
        llmEnabled={llmEnabled}
        currentNodeIsCore={currentNode.type === 'boss'}
        coreStability={rosmontis.coreStability}
        onStart={startRun}
        onReset={resetRun}
        onStabilize={stabilizeMemoryCore}
        onContinueMindsea={() => continueToMindsea(llmEnabled)}
      />
      <NovelRunDirector />
      <GameHud
        run={run}
        rosmontis={rosmontis}
        progression={progression}
        echoes={economy.echoes}
        scoutPoints={economy.scoutPoints}
        moduleCount={modules.length}
      />
      <RosmontisPresence
        rosmontis={rosmontis}
        bossPhase={pendingEncounter?.kind === 'boss' ? pendingEncounter.phase : null}
        onAction={resolveEncounterAction}
      />

      <section id="game-stage" className="game-stage" role="region" aria-label="记忆迷宫" data-scene-phase={scene.phase}>
        {showMap ? (
          <>
            <MazeStage
              maze={maze}
              currentNodeId={run.currentNodeId}
              viewMode={viewMode}
              camera={scene.camera}
              onCameraChange={(camera) => dispatchScene({ type: 'set-camera', camera })}
              onViewModeChange={setMemoryView}
              onRequestEnter={moveToNode}
              explorationCharges={explorationCharges}
              scoutPoints={economy.scoutPoints}
              movementLocked={Boolean(pendingEncounter && !pendingEncounter.resolved)}
              currentEncounterUnresolved={Boolean(pendingEncounter && !pendingEncounter.resolved)}
              onUseExplorationPower={useExplorationPower}
              onSpendScoutPoint={spendScoutPoint}
              nodeBriefs={run.mode === 'novel' ? novel?.content.nodeBriefs : undefined}
            />
            <NovelMazeBrief mode={run.mode} novel={novel} />
          </>
        ) : (
          <NodeScene
            node={currentNode}
            brief={currentBrief}
            encounter={pendingEncounter}
            rosmontis={rosmontis}
            explorationCharges={explorationCharges}
            ruleLog={ruleLog}
            inventory={inventory}
            echoes={economy.echoes}
            modules={modules}
            resonanceActive={routeEffects.resonanceActive}
            canAdvanceFloor={Boolean(pendingEncounter?.resolved && currentNode.id === maze.coreNodeId && run.floor < run.maxFloor)}
            onResolve={resolveEncounterChoice}
            onAction={resolveEncounterAction}
            onSellFragment={sellRunFragment}
            onAdvanceFloor={advanceRunFloor}
            onReturnToMaze={returnToMaze}
          />
        )}
      </section>

      <FragmentOverflowDialog inventory={inventory} onResolve={resolveFragmentChoice} />
    </section>
  );
}
