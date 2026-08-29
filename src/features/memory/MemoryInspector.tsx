import {
  AnchorSimple,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Crosshair,
  DoorOpen,
  Pulse,
  Scan,
  UserFocus,
  WarningDiamond,
} from '@phosphor-icons/react';
import { Meter } from '../../components/Meter';
import { StatusBadge } from '../../components/StatusBadge';
import type { MemoryDirection, MemoryNode } from '../../types/game';
import { ProvenanceLink } from '../tavern/projection/ProvenanceLink';

interface MemoryInspectorProps {
  node: MemoryNode | null;
  onExpand: (direction: MemoryDirection) => void;
  onEnter: () => void;
  onNotify: (title: string, message: string) => void;
}

export function MemoryInspector({ node, onExpand, onEnter, onNotify }: MemoryInspectorProps) {
  if (!node) {
    return (
      <aside className="memory-inspector is-empty" aria-label="节点检查器">
        <Crosshair size={28} aria-hidden />
        <span className="panel-code">NODE INSPECTOR / STANDBY</span>
        <h2>选择一个记忆节点</h2>
        <p>查看环境、敌我驻守与污染效果，并从该坐标向未知区域拓建。</p>
      </aside>
    );
  }

  return (
    <aside className="memory-inspector" aria-labelledby="memory-inspector-title">
      <header className="memory-inspector-header">
        <div><span className="panel-code">NODE / {node.id.toUpperCase()}</span><h2 id="memory-inspector-title">{node.title}</h2><small>{node.layer} · 更新于 {node.updatedAt}</small></div>
        <StatusBadge label={`危险 ${node.risk}`} tone={node.risk === 'A' || node.risk === 'S' ? 'danger' : node.risk === 'B' ? 'warning' : 'memory'} />
      </header>
      <ProvenanceLink sessionId={node.sourceSessionId} messageId={node.sourceMessageId} matchedLorebookEntryIds={node.matchedLorebookEntryIds} idSuffix={`memory-${node.id}`} />
      <p className="memory-node-summary">{node.summary}</p>
      <Meter id={`memory-exploration-${node.id}`} label="探索完成度" value={node.exploration} tone="memory" />

      <div className="memory-force-grid">
        <div><span><WarningDiamond size={15} weight="fill" aria-hidden />敌对驻守</span><strong>{node.hostileCount ?? '未知'}</strong><small>{node.hostileCount === null ? '信号受污染' : '已定位单位'}</small></div>
        <div><span><UserFocus size={15} aria-hidden />迷迭香信标</span><strong>{node.alliedCount > 0 ? '在线' : '未建立'}</strong><small>{node.alliedCount > 0 ? '神经链路稳定' : '当前节点未接入'}</small></div>
      </div>

      <section className="memory-inspector-section"><h3><Pulse size={15} aria-hidden />环境效应</h3><ul>{node.effects.map((effect) => <li key={effect}>{effect}</li>)}</ul></section>
      <section className="memory-inspector-section"><h3><Scan size={15} aria-hidden />已获情报</h3><ul>{node.intelligence.map((item) => <li key={item}>{item}</li>)}</ul></section>

      <section className="memory-expansion-controls" aria-labelledby="memory-expansion-title">
        <div><span className="panel-code">PATH CONSTRUCTION</span><h3 id="memory-expansion-title">路径拓建</h3></div>
        <div>
          <button id="memory-expand-left" type="button" onClick={() => onExpand('left')}><ArrowLeft size={16} aria-hidden />向左拓建</button>
          <button id="memory-expand-down" type="button" onClick={() => onExpand('down')}><ArrowDown size={16} aria-hidden />向下拓建</button>
          <button id="memory-expand-right" type="button" onClick={() => onExpand('right')}>向右拓建<ArrowRight size={16} aria-hidden /></button>
        </div>
      </section>

      <div className="memory-node-actions">
        <button id="memory-node-enter" className="terminal-button is-primary" type="button" onClick={onEnter}><DoorOpen size={17} aria-hidden />进入节点</button>
        <button id="memory-node-anchor" className="terminal-button is-secondary" type="button" onClick={() => onNotify('锚定协议已排队', '该节点将在下一次回合结算后固化为安全返回点。')}><AnchorSimple size={17} aria-hidden />建立锚点</button>
        <button id="memory-node-rescan" className="terminal-button is-secondary" type="button" onClick={() => onNotify('深度扫描已启动', '环境信号正在与情报档案库进行交叉比对。')}><Scan size={17} aria-hidden />深度扫描</button>
      </div>
    </aside>
  );
}
