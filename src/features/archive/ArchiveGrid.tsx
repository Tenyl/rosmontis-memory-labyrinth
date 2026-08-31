import {
  ArrowUpRight,
  Eye,
  Link as LinkSimple,
  MapPin,
  Pin as PushPin,
  ShieldAlert as ShieldWarning,
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import type { ArchiveRecord } from '../../types/game';
import { ProvenanceLink } from '../tavern/projection/ProvenanceLink';

interface ArchiveGridProps {
  records: ArchiveRecord[];
  onOpen: (record: ArchiveRecord) => void;
  onTogglePin: (recordId: string) => void;
}

export function ArchiveGrid({ records, onOpen, onTogglePin }: ArchiveGridProps) {
  if (records.length === 0) {
    return <div className="archive-empty"><Eye size={28} aria-hidden /><h2>没有匹配的档案</h2><p>修改关键词或类型筛选以重新检索本地情报。</p></div>;
  }

  return (
    <section className="archive-grid" aria-label="档案记录">
      {records.map((record) => (
        <article key={record.id} className={`archive-card is-${record.kind}${record.unread ? ' is-unread' : ''}`}>
          <header>
            <div><span className="archive-code">{record.code}</span><StatusBadge label={record.kind} tone={record.kind === '人物' ? 'memory' : record.contamination === 'A' ? 'danger' : 'neutral'} /></div>
            <button id={`archive-pin-${record.id}`} type="button" className={record.pinned ? 'is-pinned' : ''} aria-label={`${record.pinned ? '取消钉选' : '钉选'}${record.title}`} aria-pressed={record.pinned} onClick={() => onTogglePin(record.id)}><PushPin size={18} aria-hidden /></button>
          </header>
          <div className="archive-card-body">
            {record.unread ? <span className="archive-unread">新情报 / UNREAD</span> : null}
            <h2>{record.title}</h2>
            <p>{record.summary}</p>
            <ProvenanceLink sessionId={record.sourceSessionId} messageId={record.sourceMessageId} matchedLorebookEntryIds={record.matchedLorebookEntryIds} idSuffix={`archive-${record.id}`} />
          </div>
          <dl className="archive-card-telemetry">
            <div><dt><Eye size={13} aria-hidden />可信度</dt><dd>{record.confidence}%</dd></div>
            <div><dt><ShieldWarning size={13} aria-hidden />污染</dt><dd>{record.contamination}</dd></div>
            <div><dt><LinkSimple size={13} aria-hidden />关联</dt><dd>{record.relatedIds.length}</dd></div>
          </dl>
          <footer><span><MapPin size={13} aria-hidden />{record.discoveredIn}</span><button id={`archive-detail-open-${record.id}`} type="button" onClick={() => onOpen(record)} aria-label={`查看${record.title}详情`}>打开档案<ArrowUpRight size={15} aria-hidden /></button></footer>
        </article>
      ))}
    </section>
  );
}
