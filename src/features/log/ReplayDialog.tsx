import { ArrowRight, LinkSimple, Quotes, User } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { Dialog } from '../../components/Dialog';
import type { ActionLogEntry, NarrativeEntry } from '../../types/game';

interface ReplayDialogProps { entry: ActionLogEntry | null; narrative: NarrativeEntry[]; onClose: () => void; }

export function ReplayDialog({ entry, narrative, onClose }: ReplayDialogProps) {
  const source = narrative.find((item) => item.id === entry?.sourceEntryId);
  return (
    <Dialog id="log-replay-dialog" title="剧情回溯" eyebrow="ACTION TRACE / IMMUTABLE" open={Boolean(entry)} onClose={onClose} footer={<button id="log-replay-close-confirm" className="terminal-button is-primary" type="button" onClick={onClose}>返回时间线<ArrowRight size={16} aria-hidden /></button>}>
      {entry ? <div className="replay-content">
        <header><span>{entry.timestamp} / {entry.kind}</span><h3>{entry.title}</h3><p>{entry.summary}</p></header>
        <dl><div><dt><User size={14} aria-hidden />执行者</dt><dd>{entry.actor}</dd></div><div><dt><LinkSimple size={14} aria-hidden />来源编号</dt><dd>{entry.sourceEntryId ?? '系统状态记录'}</dd></div></dl>
        <section><h3><Quotes size={17} aria-hidden />原始剧情片段</h3><blockquote>{source?.body ?? '该记录由系统状态变化生成，没有对应的剧情文本片段。'}</blockquote>{source?.check ? <div className="replay-check"><span>{source.check.attribute}</span><strong>{source.check.roll} + {source.check.modifier} = {source.check.total}</strong><em>{source.check.result}</em></div> : null}</section>
        {entry.relatedPath ? <Link id="log-replay-related-link" className="replay-related-link" to={entry.relatedPath} onClick={onClose}>前往相关页面<ArrowRight size={15} aria-hidden /></Link> : null}
      </div> : null}
    </Dialog>
  );
}
