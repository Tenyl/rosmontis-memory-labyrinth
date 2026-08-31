import {
  Eye,
  Users as UsersThree,
  TriangleAlert as WarningDiamond,
} from 'lucide-react';
import { memoryNodeLabel } from './MemoryGraph';
import type { MemoryLayer, MemoryNode } from '../../types/game';

interface MemoryListProps {
  nodes: MemoryNode[];
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

const layers: MemoryLayer[] = ['表层记忆', '深层潜意识', '未知战局'];

export function MemoryList({ nodes, selectedNodeId, onSelect }: MemoryListProps) {
  return (
    <section className="memory-list" aria-labelledby="memory-list-title">
      <header className="memory-canvas-header"><div><span className="panel-code">ACCESSIBLE NODE INDEX</span><h2 id="memory-list-title">节点战术列表</h2></div></header>
      {layers.map((layer, layerIndex) => {
        const layerNodes = nodes.filter((node) => node.layer === layer);
        if (layerNodes.length === 0) return null;
        return (
          <section key={layer} className="memory-list-group" aria-labelledby={`memory-layer-${layerIndex}`}>
            <header><span>{String(layerIndex).padStart(2, '0')}</span><h3 id={`memory-layer-${layerIndex}`}>{layer}</h3><small>{layerNodes.length} NODES</small></header>
            <div className="memory-list-grid">
              {layerNodes.map((node) => (
                <button
                  id={`memory-list-node-${node.id}`}
                  key={node.id}
                  className={`memory-list-node is-risk-${node.risk}${selectedNodeId === node.id ? ' is-selected' : ''}`}
                  type="button"
                  aria-label={memoryNodeLabel(node)}
                  aria-pressed={selectedNodeId === node.id}
                  onClick={() => onSelect(node.id)}
                >
                  <span className="memory-list-code">{node.id.toUpperCase().replaceAll('-', ' / ')}</span>
                  <strong>{node.title}</strong>
                  <p>{node.summary}</p>
                  <footer><span><WarningDiamond size={13} aria-hidden />危险 {node.risk}</span><span><UsersThree size={13} aria-hidden />{node.hostileCount === null ? '敌情未知' : `敌对 ${node.hostileCount}`}</span><span><Eye size={13} aria-hidden />{node.exploration}%</span></footer>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}
