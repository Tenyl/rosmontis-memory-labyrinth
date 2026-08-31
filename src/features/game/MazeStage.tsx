import {
  AudioWaveform,
  BriefcaseMedical,
  CircleHelp,
  Crown,
  Crosshair,
  Eye,
  List,
  LocateFixed,
  KeyRound as LockKey,
  Map as MapIcon,
  Maximize2,
  Minus,
  Plus,
  Shield,
  Sparkles,
  Store,
} from 'lucide-react';
import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { SegmentedControl } from '../../components/SegmentedControl';
import { NODE_TYPE_NAMES } from '../../game/terminology';
import type {
  ExplorationCharges,
  ExplorationPowerAction,
  MazeGraph,
  MazeNode,
  MazeNodeState,
  MazeNodeType,
} from '../../game/types';
import type { NovelNodeBrief } from '../../llm/gameContent';
import { buildMazeLayout, buildMazePath } from './mazeLayout';
import type { GameSceneCamera } from './sceneState';

interface MazeStageProps {
  maze: MazeGraph;
  currentNodeId: string;
  viewMode: 'graph' | 'list';
  camera: GameSceneCamera;
  movementLocked?: boolean;
  currentEncounterUnresolved?: boolean;
  nodeBriefs?: readonly NovelNodeBrief[];
  explorationCharges?: ExplorationCharges;
  scoutPoints?: number;
  onCameraChange: (camera: GameSceneCamera) => void;
  onViewModeChange: (mode: 'graph' | 'list') => void;
  onRequestEnter: (nodeId: string) => void;
  onUseExplorationPower?: (action: ExplorationPowerAction) => void;
  onSpendScoutPoint?: (nodeId: string) => void;
}

const NODE_STATE_LABELS: Record<MazeNodeState, string> = {
  hidden: '未侦测',
  detected: '已侦测',
  reachable: '可抵达',
  current: '当前节点',
  completed: '已完成',
  corrupted: '受污染',
};

const DEFAULT_CHARGES: ExplorationCharges = {
  breach: 0,
  watch: 0,
  perception: 0,
  resonance: 0,
};

const clampScale = (scale: number) => Math.min(1.8, Math.max(0.75, Math.round(scale * 100) / 100));

function NodeTypeIcon({ type }: { type: MazeNodeType }) {
  const props = { size: 18, 'aria-hidden': true } as const;
  if (type === 'combat' || type === 'emergency-combat') return <Crosshair {...props} />;
  if (type === 'safehouse') return <BriefcaseMedical {...props} />;
  if (type === 'shop') return <Store {...props} />;
  if (type === 'encounter' || type === 'dilemma') return <Sparkles {...props} />;
  if (type === 'unknown') return <CircleHelp {...props} />;
  return <Crown {...props} />;
}

function nodeAccessibleName(node: MazeNode, isCurrent: boolean) {
  const state = isCurrent ? NODE_STATE_LABELS.current : NODE_STATE_LABELS[node.state];
  const revealed = node.type === 'unknown' && node.revealed && node.hiddenType
    ? `，已揭示为${NODE_TYPE_NAMES[node.hiddenType]}`
    : '';
  return `${NODE_TYPE_NAMES[node.type]}${revealed}，风险 ${node.risk}，${state}，第 ${node.floor} 层，深度 ${node.depth}`;
}

function canFocusNode(node: MazeNode, isCurrent: boolean) {
  return isCurrent || !['hidden', 'corrupted', 'completed'].includes(node.state);
}

function canEnterNode(
  node: MazeNode,
  isCurrent: boolean,
  movementLocked: boolean,
  currentEncounterUnresolved: boolean,
) {
  if (isCurrent) return currentEncounterUnresolved;
  return node.state === 'reachable' && !movementLocked;
}

export function MazeStage({
  maze,
  currentNodeId,
  viewMode,
  camera,
  movementLocked = false,
  currentEncounterUnresolved = false,
  nodeBriefs = [],
  explorationCharges = DEFAULT_CHARGES,
  scoutPoints = 0,
  onCameraChange,
  onViewModeChange,
  onRequestEnter,
  onUseExplorationPower = () => undefined,
  onSpendScoutPoint = () => undefined,
}: MazeStageProps) {
  const layout = useMemo(() => buildMazeLayout(maze.nodes), [maze.nodes]);
  const briefs = useMemo(() => new Map(nodeBriefs.map((brief) => [brief.nodeId, brief])), [nodeBriefs]);
  const [focusedNodeId, setFocusedNodeId] = useState(currentNodeId);
  const drag = useRef<{ pointerId: number; x: number; y: number; camera: GameSceneCamera } | null>(null);
  const frame = useRef<number | null>(null);
  const focusedNode = maze.nodes.find((node) => node.id === focusedNodeId)
    ?? maze.nodes.find((node) => node.id === currentNodeId)
    ?? maze.nodes[0];
  const lockedEdges = maze.edges.filter((edge) => edge.sourceId === currentNodeId && edge.locked);

  const updateScale = (nextScale: number) => {
    onCameraChange({ ...camera, scale: clampScale(nextScale) });
  };

  const focusCurrentNode = () => {
    const point = layout.get(currentNodeId);
    if (!point) return;
    onCameraChange({
      x: Math.round((50 - point.x) * 10),
      y: Math.round((50 - point.y) * 6),
      scale: 1.35,
    });
    setFocusedNodeId(currentNodeId);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, camera };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const next = {
      ...drag.current.camera,
      x: drag.current.camera.x + event.clientX - drag.current.x,
      y: drag.current.camera.y + event.clientY - drag.current.y,
    };
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => onCameraChange(next));
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const renderNode = (node: MazeNode, index: number, variant: 'graph' | 'list') => {
    const isCurrent = node.id === currentNodeId;
    const isFocused = node.id === focusedNode.id;
    const enabled = canFocusNode(node, isCurrent);
    const enters = canEnterNode(node, isCurrent, movementLocked, currentEncounterUnresolved);
    const point = layout.get(node.id);
    const brief = briefs.get(node.id);
    const revealedType = node.type === 'unknown' && node.revealed && node.hiddenType
      ? NODE_TYPE_NAMES[node.hiddenType]
      : null;
    const style = variant === 'graph' && point
      ? ({ left: `${point.x}%`, top: `${point.y}%` } satisfies CSSProperties)
      : undefined;

    return (
      <button
        id={`game-maze-node-${node.id}`}
        key={node.id}
        type="button"
        className={`maze-node is-${variant} is-${node.type} is-${isCurrent ? 'current' : node.state}${isFocused ? ' is-focused' : ''}`}
        style={style}
        aria-label={nodeAccessibleName(node, isCurrent)}
        aria-current={isCurrent ? 'step' : undefined}
        aria-pressed={isFocused}
        data-node-state={isCurrent ? 'current' : node.state}
        disabled={!enabled}
        onFocus={() => setFocusedNodeId(node.id)}
        onPointerEnter={() => setFocusedNodeId(node.id)}
        onClick={() => {
          setFocusedNodeId(node.id);
          if (enters) onRequestEnter(node.id);
        }}
      >
        <span className="maze-node-heading">
          <NodeTypeIcon type={node.type} />
          <span>N-{String(index + 1).padStart(2, '0')}</span>
          <small>RISK {node.risk}</small>
        </span>
        <strong>{brief?.title ?? NODE_TYPE_NAMES[node.type]}</strong>
        {revealedType ? <span className="maze-node-reveal">侦测：{revealedType}</span> : null}
        {variant === 'list' && brief ? <span className="maze-node-brief">{brief.description}</span> : null}
        <span className="maze-node-state">{isCurrent ? NODE_STATE_LABELS.current : NODE_STATE_LABELS[node.state]}</span>
      </button>
    );
  };

  const canScan = focusedNode?.type === 'unknown' && !focusedNode.revealed && focusedNode.state === 'reachable';
  const focusedIsCurrent = focusedNode?.id === currentNodeId;

  return (
    <section className="maze-stage" aria-labelledby="maze-stage-title">
      <header className="maze-stage-header">
        <div>
          <span>NEURAL ROUTE / FLOOR {String(maze.floor).padStart(2, '0')}</span>
          <h2 id="maze-stage-title">记忆迷宫拓扑</h2>
          <p>选择发光的可抵达节点即可进入；地图和节点场景始终位于同一作战舞台。</p>
        </div>
        <SegmentedControl
          id="game-maze-view-switch"
          label="迷宫视图"
          value={viewMode}
          items={[
            { value: 'graph', label: '拓扑地图', icon: <MapIcon size={16} aria-hidden /> },
            { value: 'list', label: '节点列表', icon: <List size={16} aria-hidden /> },
          ]}
          onChange={onViewModeChange}
        />
      </header>

      {viewMode === 'graph' ? (
        <div className="maze-viewport-shell">
          <div className="maze-camera-controls" role="group" aria-label="地图镜头控制">
            <button id="game-maze-zoom-in" type="button" aria-label="放大地图" onClick={() => updateScale(camera.scale + 0.2)}><Plus size={17} aria-hidden /></button>
            <button id="game-maze-zoom-out" type="button" aria-label="缩小地图" onClick={() => updateScale(camera.scale - 0.2)}><Minus size={17} aria-hidden /></button>
            <button id="game-maze-fit" type="button" aria-label="适配全部节点" onClick={() => onCameraChange({ x: 0, y: 0, scale: 1 })}><Maximize2 size={17} aria-hidden /></button>
            <button id="game-maze-current" type="button" aria-label="定位当前节点" onClick={focusCurrentNode}><LocateFixed size={17} aria-hidden /></button>
            <output aria-live="polite">{Math.round(camera.scale * 100)}%</output>
          </div>
          <div
            className="maze-viewport"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onWheel={(event) => {
              event.preventDefault();
              updateScale(camera.scale + (event.deltaY < 0 ? 0.1 : -0.1));
            }}
          >
            <div
              className="maze-camera"
              style={{ transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})` }}
            >
              <svg className="maze-route-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {maze.edges.map((edge) => {
                  const source = layout.get(edge.sourceId);
                  const target = layout.get(edge.targetId);
                  if (!source || !target) return null;
                  const sourceNode = maze.nodes.find((node) => node.id === edge.sourceId);
                  const targetNode = maze.nodes.find((node) => node.id === edge.targetId);
                  const completed = sourceNode?.state === 'completed' && targetNode?.state === 'completed';
                  return (
                    <path
                      key={edge.id}
                      className={`maze-route-path${edge.locked ? ' is-locked' : ''}${completed ? ' is-completed' : ''}`}
                      d={buildMazePath(source, target)}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>
              <div className="maze-node-layer">
                {maze.nodes.map((node, index) => renderNode(node, index, 'graph'))}
              </div>
            </div>
          </div>
          <div className="maze-state-legend" aria-label="节点状态图例">
            {(['current', 'reachable', 'hidden', 'completed'] as const).map((state) => (
              <span key={state} className={`is-${state}`}><i />{NODE_STATE_LABELS[state]}</span>
            ))}
            <span className="is-locked"><i />封锁路径</span>
          </div>
        </div>
      ) : (
        <section className="maze-list-panel" aria-labelledby="maze-list-title">
          <div className="maze-list-heading">
            <span>KEYBOARD ROUTE</span>
            <h3 id="maze-list-title">节点战术列表</h3>
            <p>与拓扑地图使用相同的移动规则，可通过键盘逐项操作。</p>
          </div>
          <div className="maze-node-list">
            {maze.nodes.map((node, index) => renderNode(node, index, 'list'))}
          </div>
        </section>
      )}

      {focusedNode ? (
        <aside className="maze-context-toolbar" aria-label="当前节点探索工具">
          <div className="maze-context-summary">
            <span>FOCUS / DEPTH {String(focusedNode.depth).padStart(2, '0')}</span>
            <strong>{NODE_TYPE_NAMES[focusedNode.type]}</strong>
            <small>{NODE_STATE_LABELS[focusedNode.id === currentNodeId ? 'current' : focusedNode.state]} · 风险 {focusedNode.risk}</small>
          </div>
          <div className="maze-context-actions">
            {canScan ? (
              <>
                <button
                  id={`game-maze-perception-${focusedNode.id}`}
                  type="button"
                  className="terminal-button is-secondary"
                  disabled={explorationCharges.perception === 0}
                  onClick={() => onUseExplorationPower({ swordId: 'perception', nodeId: focusedNode.id })}
                ><Eye size={17} aria-hidden />认知侦测</button>
                <button
                  id={`game-maze-scout-${focusedNode.id}`}
                  type="button"
                  className="terminal-button is-secondary"
                  disabled={scoutPoints <= 0}
                  onClick={() => onSpendScoutPoint(focusedNode.id)}
                ><Eye size={17} aria-hidden />消耗 1 点侦测</button>
              </>
            ) : null}
            {focusedIsCurrent && lockedEdges[0] ? (
              <button
                id={`game-maze-breach-${lockedEdges[0].id}`}
                type="button"
                className="terminal-button is-secondary"
                disabled={explorationCharges.breach === 0}
                onClick={() => onUseExplorationPower({ swordId: 'breach', edgeId: lockedEdges[0].id })}
              ><LockKey size={17} aria-hidden />破壁开路</button>
            ) : null}
            {focusedIsCurrent ? (
              <>
                <button id="game-maze-watch" type="button" className="terminal-button is-secondary" disabled={explorationCharges.watch === 0} onClick={() => onUseExplorationPower({ swordId: 'watch' })}><Shield size={17} aria-hidden />守望防护</button>
                <button id="game-maze-resonance" type="button" className="terminal-button is-secondary" disabled={explorationCharges.resonance === 0} onClick={() => onUseExplorationPower({ swordId: 'resonance' })}><AudioWaveform size={17} aria-hidden />预备共鸣</button>
              </>
            ) : null}
          </div>
        </aside>
      ) : null}
    </section>
  );
}
