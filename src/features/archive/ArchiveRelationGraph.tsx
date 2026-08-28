import { LinkSimple, Path, Plus, X } from '@phosphor-icons/react';
import type { ArchiveLink, ArchiveRecord } from '../../types/game';

interface ArchiveRelationGraphProps {
  records: ArchiveRecord[];
  links: ArchiveLink[];
  selectedIds: string[];
  onToggleSelect: (recordId: string) => void;
  onCreateLink: () => void;
}

const positions: Record<string, { x: number; y: number }> = {
  'archive-wet-record': { x: 21, y: 32 },
  'archive-elaine': { x: 52, y: 18 },
  'archive-broadcast': { x: 75, y: 53 },
  'archive-r09-record': { x: 39, y: 72 },
  'archive-deep-chorus': { x: 75, y: 82 },
};

export function ArchiveRelationGraph({ records, links, selectedIds, onToggleSelect, onCreateLink }: ArchiveRelationGraphProps) {
  const recordsById = Object.fromEntries(records.map((record) => [record.id, record]));
  return (
    <section className="archive-relations" aria-labelledby="archive-relations-title">
      <header className="archive-view-header"><div><span className="panel-code">EVIDENCE RELATION MAP / INTERACTIVE</span><h2 id="archive-relations-title">情报关系图</h2><p>选择两份档案可建立新的“支持”关系；系统保留原始冲突标记。</p></div><button id="archive-create-link" className="terminal-button is-primary" type="button" disabled={selectedIds.length !== 2} onClick={onCreateLink}><Plus size={16} aria-hidden />建立关联</button></header>
      <div className="relation-workbench">
        <div className="relation-canvas">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {links.map((link) => {
              const source = positions[link.sourceId];
              const target = positions[link.targetId];
              if (!source || !target) return null;
              return <line key={link.id} className={`is-${link.relation}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} />;
            })}
          </svg>
          {records.map((record) => {
            const position = positions[record.id] ?? { x: 50, y: 50 };
            const selected = selectedIds.includes(record.id);
            return <button id={`archive-relation-node-${record.id}`} key={record.id} className={`relation-node is-${record.kind}${selected ? ' is-selected' : ''}`} style={{ left: `${position.x}%`, top: `${position.y}%` }} type="button" aria-pressed={selected} onClick={() => onToggleSelect(record.id)}><span>{record.code}</span><strong>{record.title}</strong><small>可信度 {record.confidence}%</small></button>;
          })}
        </div>
        <aside className="relation-list" aria-label="关联列表">
          <header><Path size={17} aria-hidden /><span>已确认关系</span><strong>{links.length}</strong></header>
          <ul>{links.map((link) => <li key={link.id}><i className={`is-${link.relation}`} /><div><span>{recordsById[link.sourceId]?.title ?? '未知档案'}</span><small>{link.relation}</small><span>{recordsById[link.targetId]?.title ?? '未知档案'}</span></div></li>)}</ul>
          {selectedIds.length > 0 ? <div className="relation-selection"><span><LinkSimple size={14} aria-hidden />已选择 {selectedIds.length} / 2</span>{selectedIds.map((id) => <button id={`archive-relation-remove-${id}`} key={id} type="button" onClick={() => onToggleSelect(id)}>{recordsById[id]?.title}<X size={13} aria-hidden /></button>)}</div> : null}
        </aside>
      </div>
    </section>
  );
}
