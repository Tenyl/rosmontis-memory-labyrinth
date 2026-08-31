import {
  MessageCircle as ChatCircleText,
  ClipboardList as ClipboardText,
  Crosshair,
  Scan,
  ShieldAlert as ShieldWarning,
  AlignLeft as TextAlignLeft,
} from 'lucide-react';
import type { NarrativeEntry } from '../../types/game';

interface NarrativeStreamProps {
  entries: NarrativeEntry[];
  activeEntryId: string | null;
  onOpenCheck: (entry: NarrativeEntry) => void;
}

const kindIcon = {
  叙事: TextAlignLeft,
  对白: ChatCircleText,
  扫描: Scan,
  检定: Crosshair,
  警报: ShieldWarning,
};

export function NarrativeStream({ entries, activeEntryId, onOpenCheck }: NarrativeStreamProps) {
  const copyEntry = async (entry: NarrativeEntry) => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(`${entry.title}\n${entry.body}`);
  };

  return (
    <section className="narrative-stream" aria-labelledby="narrative-stream-title">
      <header className="narrative-stream-header">
        <div>
          <span className="panel-code">NARRATIVE FEED / CHAPTER 01</span>
          <h2 id="narrative-stream-title">剧情文本流</h2>
        </div>
        <span className="stream-sequence">SEQ. {String(entries.length).padStart(2, '0')}</span>
      </header>

      <div className="narrative-timeline">
        {entries.map((entry) => {
          const Icon = kindIcon[entry.kind];
          const isActive = activeEntryId === entry.id;
          return (
            <article key={entry.id} className={`narrative-entry is-${entry.kind}${isActive ? ' is-streaming' : ''}`}>
              <div className="narrative-entry-rail" aria-hidden="true">
                <span>{String(entry.index).padStart(2, '0')}</span>
                <i><Icon size={16} /></i>
              </div>
              <div className="narrative-entry-content">
                <header>
                  <div>
                    <span>{entry.kind}{entry.speaker ? ` / ${entry.speaker}` : ''}</span>
                    <time>{entry.timestamp}</time>
                  </div>
                  <button
                    id={`operation-copy-entry-${entry.id}`}
                    type="button"
                    aria-label={`复制${entry.title}`}
                    onClick={() => void copyEntry(entry)}
                  >
                    <ClipboardText size={17} aria-hidden />
                  </button>
                </header>
                <h3>{entry.title}</h3>
                <p>{entry.body || '正在建立叙事上下文……'}{isActive ? <span className="stream-cursor" aria-hidden="true" /> : null}</p>
                {entry.check ? (
                  <button
                    id={`operation-check-detail-${entry.id}`}
                    className="check-result-strip"
                    type="button"
                    onClick={() => onOpenCheck(entry)}
                  >
                    <span>检定详情</span>
                    <strong>{entry.check.roll} + {entry.check.modifier} = {entry.check.total}</strong>
                    <em>{entry.check.result}</em>
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
