import {
  Archive,
  ArrowUpRight,
  CheckCircle,
  ClockCounterClockwise,
  Command,
  Flag,
  MapPin,
  Pulse,
} from '@phosphor-icons/react';
import type { ActionLogEntry } from '../../types/game';
import { ProvenanceLink } from '../tavern/projection/ProvenanceLink';

interface ActionTimelineProps {
  entries: ActionLogEntry[];
  onOpen: (entry: ActionLogEntry) => void;
}

const icons = { 章节: Flag, 指令: Command, 检定: CheckCircle, 状态变化: Pulse, 节点解锁: MapPin, 情报入库: Archive };

export function ActionTimeline({ entries, onOpen }: ActionTimelineProps) {
  return (
    <section className="action-timeline" aria-label="行动时间线">
      {entries.map((entry, index) => {
        const Icon = icons[entry.kind];
        return (
          <article key={entry.id} className={`action-log-entry is-${entry.kind}`}>
            <div className="log-time"><time>{entry.timestamp}</time><span>{String(index + 1).padStart(2, '0')}</span></div>
            <div className="log-rail" aria-hidden="true"><i><Icon size={17} weight={entry.kind === '检定' ? 'fill' : 'regular'} /></i></div>
            <div className="log-content">
              <header><span>{entry.kind}</span><small>{entry.actor} / {entry.chapter}</small></header>
              <h2>{entry.title}</h2><p>{entry.summary}</p>
              <ProvenanceLink sessionId={entry.sourceSessionId} messageId={entry.sourceMessageId} matchedLorebookEntryIds={entry.matchedLorebookEntryIds} idSuffix={`log-${entry.id}`} />
              {!entry.sourceSessionId && (entry.sourceEntryId || entry.relatedPath) ? <button id={`log-replay-open-${entry.id}`} type="button" aria-label={entry.kind === '检定' ? `打开感知检定详情：${entry.title}` : `打开${entry.title}详情`} onClick={() => onOpen(entry)}><ClockCounterClockwise size={15} aria-hidden />回溯来源<ArrowUpRight size={14} aria-hidden /></button> : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}
