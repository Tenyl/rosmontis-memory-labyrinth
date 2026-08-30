import type { CSSProperties } from 'react';
import type { MazeGraph, MazeNode, MazeNodeState, MazeNodeType } from '../../game/types';

interface RunMazePanelProps {
  maze: MazeGraph;
  currentNodeId: string;
  viewMode: 'graph' | 'list';
  onMove: (nodeId: string) => void;
}

const NODE_TYPE_LABELS: Record<MazeNodeType, string> = {
  'echo-combat': '残响实体',
  'blank-event': '空白断层',
  'thought-rest': '思维温室',
  'memory-core': '记忆核心',
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
  onMove,
}: {
  node: MazeNode;
  index: number;
  isCurrent: boolean;
  variant: 'graph' | 'list';
  position?: NodePosition;
  onMove: (nodeId: string) => void;
}) {
  const canMove = node.state === 'reachable';
  const typeLabel = NODE_TYPE_LABELS[node.type];
  const stateLabel = isCurrent ? NODE_STATE_LABELS.current : NODE_STATE_LABELS[node.state];
  const style = variant === 'graph' && position
    ? ({ left: `${position.x}%`, top: `${position.y}%` } satisfies CSSProperties)
    : undefined;

  return (
    <button
      id={`run-maze-node-${node.id}`}
      type="button"
      className={`run-maze-node is-${variant} is-${node.type} is-${node.state}`}
      style={style}
      aria-label={`${typeLabel}，${stateLabel}，第 ${node.floor} 层，深度 ${node.depth}`}
      aria-current={isCurrent ? 'step' : undefined}
      data-node-state={isCurrent ? 'current' : node.state}
      disabled={!canMove}
      onClick={() => onMove(node.id)}
    >
      <span className="run-maze-node-code">N-{String(index + 1).padStart(2, '0')}</span>
      <strong>{typeLabel}</strong>
      <span className="run-maze-node-state">{stateLabel}</span>
      <small>DEPTH {String(node.depth).padStart(2, '0')}</small>
    </button>
  );
}

export function RunMazePanel({ maze, currentNodeId, viewMode, onMove }: RunMazePanelProps) {
  const positions = buildNodePositions(maze.nodes);

  if (viewMode === 'list') {
    return (
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
              onMove={onMove}
            />
          ))}
        </div>
      </section>
    );
  }

  return (
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
            onMove={onMove}
          />
        ))}
      </div>
      <div className="run-maze-legend" aria-label="节点状态图例">
        {(['current', 'reachable', 'hidden', 'completed'] as const).map((state) => (
          <span key={state} className={`is-${state}`}><i />{NODE_STATE_LABELS[state]}</span>
        ))}
      </div>
    </section>
  );
}
