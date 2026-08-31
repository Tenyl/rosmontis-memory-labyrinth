import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useGameStore } from '../../store/gameStore';
import { FragmentOverflowDialog } from '../operation/FragmentOverflowDialog';
import { NovelRunDirector } from '../operation/NovelRunDirector';
import { RunLifecycleDialog } from '../operation/RunLifecycleDialog';
import { NovelMazeBrief } from '../memory/NovelMazeBrief';
import { useTavern } from '../tavern/runtime/useTavern';
import { GameHud } from './GameHud';
import { MazeStage } from './MazeStage';
import { NodeTransitionLayer } from './NodeTransitionLayer';
import { NodeScene } from './NodeScene';
import { GameDirectorBoundary } from './GameDirectorBoundary';
import { RosmontisPresence } from './RosmontisPresence';
import { gameSceneReducer, restoreGameSceneState } from './sceneState';
import { createSaveSlot, getActiveSaveSlotId } from '../../game/saveSlots';
import '../operation/operation.css';
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
  const viewMode = useGameStore((state) => state.ui.mazeViewMode);
  const motionPreference = useGameStore((state) => state.ui.preferences.motion);
  const moveToNode = useGameStore((state) => state.moveToNode);
  const setMazeView = useGameStore((state) => state.setMazeView);
  const useExplorationPower = useGameStore((state) => state.useExplorationPower);
  const spendScoutPoint = useGameStore((state) => state.spendScoutPoint);
  const beginCurrentEncounter = useGameStore((state) => state.beginCurrentEncounter);
  const resolveEncounterChoice = useGameStore((state) => state.resolveEncounterChoice);
  const resolveEncounterAction = useGameStore((state) => state.resolveEncounterAction);
  const sellRunFragment = useGameStore((state) => state.sellRunFragment);
  const advanceRunFloor = useGameStore((state) => state.advanceRunFloor);
  const continueToMindsea = useGameStore((state) => state.continueToMindsea);
  const resolveFragmentChoice = useGameStore((state) => state.resolveFragmentChoice);
  const resetRun = useGameStore((state) => state.resetRun);
  const [scene, dispatchScene] = useReducer(gameSceneReducer, pendingEncounter, restoreGameSceneState);
  const pendingFocus = useRef<{ kind: 'map' | 'node'; nodeId: string } | null>(null);
  const currentNode = maze.nodes.find((node) => node.id === run.currentNodeId) ?? maze.nodes[0];
  const currentBrief = run.mode === 'novel'
    ? novel?.content.nodeBriefs.find((brief) => brief.nodeId === currentNode.id)
    : undefined;
  const llmEnabled = Boolean(runtime.settings?.api.apiKey.trim());

  useEffect(() => {
    if (run.phase === 'exploring' && !pendingEncounter && currentNode.state !== 'completed') beginCurrentEncounter();
  }, [beginCurrentEncounter, currentNode.state, pendingEncounter, run.currentNodeId, run.phase]);

  useEffect(() => {
    const slotId = getActiveSaveSlotId(localStorage);
    if (slotId) createSaveSlot(slotId, useGameStore.getState(), localStorage);
  }, [economy, inventory, maze, modules, pendingEncounter, rosmontis, run]);

  useEffect(() => {
    if (pendingEncounter && !pendingEncounter.resolved && scene.phase !== 'entering-node' && scene.phase !== 'node') {
      dispatchScene({ type: 'open-node', nodeId: pendingEncounter.nodeId });
    }
  }, [pendingEncounter, scene.phase]);

  useEffect(() => {
    if (pendingEncounter?.resolved && scene.phase === 'node') dispatchScene({ type: 'settle-node' });
  }, [pendingEncounter?.resolved, scene.phase]);

  useEffect(() => {
    if (scene.phase !== 'entering-node' || scene.commitState !== 'preview') return undefined;
    const cancelEntry = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatchScene({ type: 'cancel-entry' });
    };
    window.addEventListener('keydown', cancelEntry);
    return () => window.removeEventListener('keydown', cancelEntry);
  }, [scene.commitState, scene.phase]);

  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    if (target.kind === 'node' && scene.phase === 'node') {
      document.getElementById('game-node-scene-title')?.focus({ preventScroll: true });
      pendingFocus.current = null;
    } else if (target.kind === 'map' && scene.phase === 'map') {
      document.getElementById(`game-maze-node-${target.nodeId}`)?.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  }, [scene.phase]);

  const returnToMaze = () => {
    if (scene.phase === 'node') dispatchScene({ type: 'settle-node' });
    dispatchScene({ type: 'request-map' });
  };

  const commitNode = useCallback((transitionId: number) => {
    if (transitionId !== scene.transitionId || scene.commitState !== 'preview' || !scene.targetNodeId) return;
    moveToNode(scene.targetNodeId);
    dispatchScene({ type: 'commit-node', transitionId });
  }, [moveToNode, scene.commitState, scene.targetNodeId, scene.transitionId]);

  const openNode = useCallback((nodeId: string) => {
    const state = useGameStore.getState();
    if (state.run.currentNodeId !== nodeId || state.pendingEncounter?.nodeId !== nodeId) return;
    pendingFocus.current = { kind: 'node', nodeId };
    dispatchScene({ type: 'open-node', nodeId });
  }, []);

  const finishReturn = useCallback(() => {
    pendingFocus.current = { kind: 'map', nodeId: useGameStore.getState().run.currentNodeId };
    dispatchScene({ type: 'finish-return' });
  }, []);

  const systemReducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const reducedMotion = motionPreference === 'reduced'
    || (motionPreference === 'system' && systemReducedMotion);

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
        llmEnabled={llmEnabled}
        onReset={resetRun}
        onContinueMindsea={() => continueToMindsea(llmEnabled)}
      />
      <NovelRunDirector />
      <div className="game-play-layout">
        <aside className="game-status-rail" aria-label="当前状态">
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
        </aside>

        <section id="game-stage" className="game-stage" role="region" aria-label="记忆迷宫" data-scene-phase={scene.phase}>
        {showMap ? (
          <>
            <MazeStage
              maze={maze}
              currentNodeId={run.currentNodeId}
              viewMode={viewMode}
              camera={scene.camera}
              onCameraChange={(camera) => dispatchScene({ type: 'set-camera', camera })}
              onViewModeChange={setMazeView}
              onRequestEnter={(nodeId) => dispatchScene({ type: 'request-node', nodeId })}
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
          <GameDirectorBoundary run={run} node={currentNode}>{(presentation) => <NodeScene
            node={currentNode}
            run={run}
            presentation={presentation}
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
            onAdvanceFloor={() => { advanceRunFloor(); returnToMaze(); }}
            onReturnToMaze={returnToMaze}
          />}</GameDirectorBoundary>
        )}
        {(scene.phase === 'entering-node' || scene.phase === 'returning-map') && scene.targetNodeId ? (
          <NodeTransitionLayer
            phase={scene.phase}
            node={maze.nodes.find((node) => node.id === scene.targetNodeId) ?? currentNode}
            transitionId={scene.transitionId}
            reducedMotion={reducedMotion}
            onCommit={commitNode}
            onOpened={openNode}
            onReturnFinished={finishReturn}
          />
        ) : null}
        </section>
      </div>

      <FragmentOverflowDialog inventory={inventory} onResolve={resolveFragmentChoice} />
    </section>
  );
}
