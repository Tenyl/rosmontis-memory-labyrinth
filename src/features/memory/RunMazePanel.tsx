import {
  Crown,
  Crosshair,
  BriefcaseMedical as FirstAid,
  CircleHelp as Question,
  Sparkles as Sparkle,
  Store as Storefront,
} from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import type {
  ExplorationCharges,
  ExplorationPowerAction,
  MazeGraph,
  MazeNode,
  MazeNodeState,
  MazeNodeType,
} from '../../game/types';
import type { NovelNodeBrief } from '../../llm/gameContent';
import { NodeIntelPanel } from './NodeIntelPanel';

interface RunMazePanelProps {
  maze: MazeGraph;
  currentNodeId: string;
  viewMode: 'graph' | 'list';
  onMove: (nodeId: string) => void;
  nodeBriefs?: readonly NovelNodeBrief[];
  explorationCharges?: ExplorationCharges;
  scoutPoints?: number;
  onUseExplorationPower?: (action: ExplorationPowerAction) => void;
  onSpendScoutPoint?: (nodeId: string) => void;
  movementLocked?: boolean;
}

const NODE_TYPE_LABELS: Record<MazeNodeType, string> = {
  combat: '战斗',
  'emergency-combat': '紧急作战',
  safehouse: '休息处 / 安全屋',
  shop: '商店',
  encounter: '不期而遇 / 奇境',
  dilemma: '命运抉择',
  unknown: '未知',
  boss: 'Boss 房',
};

const NODE_STATE_LABELS: Record<MazeNodeState, string> = {
  hidden: '未侦测',
  detected: '已侦测',
  reachable: '可抵达',
  current: '当前节点',
  completed: '已完成',
  corrupted: '受污染',
};

interface NodePosition {
  x: number;
  y: number;
}

function buildNodePositions(nodes: MazeNode[]) {
  const positions = new Map<string, NodePosition>();
  const maxDepth = Math.max(1, ...nodes.map((node) => node.depth));
  const groups = new Map<number, MazeNode[]>();
  nodes.forEach((node) => groups.set(node.depth, [...(groups.get(node.depth) ?? []), node]));

  groups.forEach((group, depth) => {
    group.forEach((node, index) => {
      const isEndpoint = depth === 0 || depth === maxDepth;
      positions.set(node.id, {
        x: 10 + (depth / maxDepth) * 80,
        y: group.length === 1
          ? isEndpoint ? 50 : depth % 2 === 0 ? 32 : 68
          : 18 + (index / (group.length - 1)) * 64,
      });
    });
  });
  return positions;
}

function RunMazeNodeButton({
  node,
  index,
  isCurrent,
  variant,
  position,
  selected,
  onSelect,
  brief,
}: {
  node: MazeNode;
  index: number;
  isCurrent: boolean;
  variant: 'graph' | 'list';
  position?: NodePosition;
  selected: boolean;
  onSelect: (nodeId: string) => void;
  brief?: NovelNodeBrief;
}) {
  const canSelect = !['hidden', 'corrupted'].includes(node.state);
  const revealedType = node.type === 'unknown' && node.revealed && node.hiddenType
    ? NODE_TYPE_LABELS[node.hiddenType]
    : null;
  const typeLabel = NODE_TYPE_LABELS[node.type];
  const stateLabel = isCurrent ? NODE_STATE_LABELS.current : NODE_STATE_LABELS[node.state];
  const style = variant === 'graph' && position
    ? ({ left: `${position.x}%`, top: `${position.y}%` } satisfies CSSProperties)
    : undefined;

  return (
    <button
      id={`run-maze-node-${node.id}`}
      type="button"
      className={`run-maze-node is-${variant} is-${node.type} is-${node.state}${selected ? ' is-selected' : ''}`}
      style={style}
      aria-label={`${typeLabel}${revealedType ? `，已揭示为${revealedType}` : ''}，风险 ${node.risk}，${stateLabel}，第 ${node.floor} 层，深度 ${node.depth}`}
      aria-current={isCurrent ? 'step' : undefined}
      aria-pressed={selected}
      data-node-state={isCurrent ? 'current' : node.state}
      disabled={!canSelect}
      onClick={() => onSelect(node.id)}
    >
      <span className="run-maze-node-heading">
        <NodeTypeIcon type={node.type} />
        <span className="run-maze-node-code">N-{String(index + 1).padStart(2, '0')}</span>
        <span className={`run-maze-node-risk is-${node.risk}`}>RISK {node.risk}</span>
      </span>
      <strong>{brief?.title ?? typeLabel}</strong>
      {revealedType ? <span className="run-maze-node-reveal">侦测：{revealedType}</span> : null}
      {brief ? <span className="run-maze-node-brief">{typeLabel} · {brief.description}</span> : null}
      <span className="run-maze-node-state">{stateLabel}</span>
      <small>DEPTH {String(node.depth).padStart(2, '0')}</small>
    </button>
  );
}

function NodeTypeIcon({ type }: { type: MazeNodeType }) {
  const props = { size: 18, weight: 'regular' as const, 'aria-hidden': true };
  if (type === 'combat' || type === 'emergency-combat') return <Crosshair {...props} />;
  if (type === 'safehouse') return <FirstAid {...props} />;
  if (type === 'shop') return <Storefront {...props} />;
  if (type === 'encounter' || type === 'dilemma') return <Sparkle {...props} />;
  if (type === 'unknown') return <Question {...props} />;
  return <Crown {...props} />;
}

export function RunMazePanel({
  maze,
  currentNodeId,
  viewMode,
  onMove,
  nodeBriefs = [],
  explorationCharges = { breach: 0, watch: 0, perception: 0, resonance: 0 },
  scoutPoints = 0,
  onUseExplorationPower = () => undefined,
  onSpendScoutPoint = () => undefined,
  movementLocked = false,
}: RunMazePanelProps) {
  const positions = buildNodePositions(maze.nodes);
  const briefsById = new Map(nodeBriefs.map((brief) => [brief.nodeId, brief]));
  const [selectedNodeId, setSelectedNodeId] = useState(currentNodeId);

  useEffect(() => {
    if (!maze.nodes.some((node) => node.id === selectedNodeId)) setSelectedNodeId(currentNodeId);
  }, [currentNodeId, maze.nodes, selectedNodeId]);

  const selectedNode = maze.nodes.find((node) => node.id === selectedNodeId)
    ?? maze.nodes.find((node) => node.id === currentNodeId)
    ?? maze.nodes[0];
  const lockedEdges = maze.edges.filter((edge) => edge.sourceId === currentNodeId && edge.locked);

  const panel = viewMode === 'list' ? (
      <section className="run-maze-panel is-list" aria-labelledby="run-maze-list-title">
        <header className="run-maze-panel-header">
          <div>
            <span>KEYBOARD ROUTE / FLOOR {String(maze.floor).padStart(2, '0')}</span>
            <h2 id="run-maze-list-title">节点战术列表</h2>
          </div>
          <p>只有标记为“可抵达”的节点可以进入。</p>
        </header>
        <div className="run-maze-list">
          {maze.nodes.map((node, index) => (
            <RunMazeNodeButton
              key={node.id}
              node={node}
              index={index}
              isCurrent={node.id === currentNodeId}
              variant="list"
              selected={node.id === selectedNode.id}
              onSelect={setSelectedNodeId}
              brief={briefsById.get(node.id)}
            />
          ))}
        </div>
      </section>
  ) : (
    <section className="run-maze-panel is-graph" aria-labelledby="run-maze-graph-title">
      <header className="run-maze-panel-header">
        <div>
          <span>NEURAL TOPOLOGY / FLOOR {String(maze.floor).padStart(2, '0')}</span>
          <h2 id="run-maze-graph-title">迷宫拓扑图</h2>
        </div>
        <p>路径由本地种子规则生成；连线不参与指针操作。</p>
      </header>
      <div className="run-maze-canvas">
        <svg
          className="run-maze-edges"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{ pointerEvents: 'none' }}
        >
          {maze.edges.map((edge) => {
            const source = positions.get(edge.sourceId);
            const target = positions.get(edge.targetId);
            if (!source || !target) return null;
            return (
              <line
                key={edge.id}
                className={edge.locked ? 'is-locked' : undefined}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
              />
            );
          })}
        </svg>
        {maze.nodes.map((node, index) => (
          <RunMazeNodeButton
            key={node.id}
            node={node}
            index={index}
            isCurrent={node.id === currentNodeId}
            variant="graph"
            position={positions.get(node.id)}
            selected={node.id === selectedNode.id}
            onSelect={setSelectedNodeId}
            brief={briefsById.get(node.id)}
          />
        ))}
      </div>
      <div className="run-maze-legend" aria-label="节点状态图例">
        {(['current', 'reachable', 'hidden', 'completed'] as const).map((state) => (
          <span key={state} className={`is-${state}`}><i />{NODE_STATE_LABELS[state]}</span>
        ))}
        <span className="is-locked"><i />封锁路径</span>
      </div>
    </section>
  );

  return (
    <div className={`run-maze-workbench is-${viewMode}`}>
      {panel}
      <NodeIntelPanel
        node={selectedNode}
        currentNodeId={currentNodeId}
        lockedEdges={lockedEdges}
        explorationCharges={explorationCharges}
        scoutPoints={scoutPoints}
        movementLocked={movementLocked}
        onMove={onMove}
        onUseExplorationPower={onUseExplorationPower}
        onSpendScoutPoint={onSpendScoutPoint}
      />
    </div>
  );
}
