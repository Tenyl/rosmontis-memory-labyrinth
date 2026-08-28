import { AnchorSimple, Eye, UsersThree, WarningDiamond } from '@phosphor-icons/react';
import type { MemoryEdge, MemoryNode } from '../../types/game';

interface MemoryGraphProps {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

export function memoryNodeLabel(node: MemoryNode) {
  const hostile = node.hostileCount === null ? '敌情未知' : `敌对 ${node.hostileCount}`;
  return `${node.title}，危险 ${node.risk}，${hostile}，友方 ${node.alliedCount}，探索 ${node.exploration}%`;
}

export function MemoryGraph({ nodes, edges, selectedNodeId, onSelect }: MemoryGraphProps) {
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));

  return (
    <section className="memory-graph" aria-labelledby="memory-graph-title">
      <header className="memory-canvas-header">
        <div><span className="panel-code">COGNITION TOPOLOGY / LIVE</span><h2 id="memory-graph-title">意识拓扑图</h2></div>
        <div className="memory-legend" aria-label="路径图例"><span><i className="is-confirmed" />稳定</span><span><i className="is-polluted" />污染</span><span><i className="is-unresolved" />未知</span></div>
      </header>
      <div className="memory-canvas">
        <div className="memory-layer-label is-surface"><span>00</span>表层记忆</div>
        <div className="memory-layer-label is-deep"><span>01</span>深层潜意识 / 未知战局</div>
        <svg className="memory-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="memory-line-glow"><feGaussianBlur stdDeviation=".42" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {edges.map((edge) => {
            const source = byId[edge.sourceId];
            const target = byId[edge.targetId];
            if (!source || !target) return null;
            return <line key={edge.id} className={`is-${edge.state}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />;
          })}
        </svg>
        {nodes.map((node, index) => (
          <button
            id={`memory-node-${node.id}`}
            key={node.id}
            type="button"
            className={`memory-node is-risk-${node.risk}${selectedNodeId === node.id ? ' is-selected' : ''}${node.anchored ? ' is-anchored' : ''}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            aria-label={memoryNodeLabel(node)}
            aria-pressed={selectedNodeId === node.id}
            onClick={() => onSelect(node.id)}
          >
            <span className="memory-node-index">N-{String(index + 1).padStart(2, '0')}</span>
            <span className="memory-node-title">{node.title}</span>
            <span className="memory-node-meta"><WarningDiamond size={13} weight="fill" aria-hidden />危险 {node.risk}<i />{node.hostileCount === null ? '敌情未知' : `敌对 ${node.hostileCount}`}</span>
            <span className="memory-node-footer"><span><UsersThree size={13} aria-hidden />友方 {node.alliedCount}</span><span><Eye size={13} aria-hidden />{node.exploration}%</span>{node.anchored ? <AnchorSimple size={14} weight="fill" aria-hidden /> : null}</span>
          </button>
        ))}
        <div className="memory-depth-marker" aria-hidden="true"><span>DEPTH</span><i /><small>−03.17</small></div>
      </div>
    </section>
  );
}
