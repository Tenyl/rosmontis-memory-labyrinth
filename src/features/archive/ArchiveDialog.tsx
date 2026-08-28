import { ArrowRight, FloppyDisk, MapPin, NotePencil, ShieldWarning } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { StatusBadge } from '../../components/StatusBadge';
import type { ArchiveRecord } from '../../types/game';

interface ArchiveDialogProps {
  record: ArchiveRecord | null;
  allRecords: ArchiveRecord[];
  onClose: () => void;
  onSaveNote: (recordId: string, note: string) => void;
}

export function ArchiveDialog({ record, allRecords, onClose, onSaveNote }: ArchiveDialogProps) {
  const [draft, setDraft] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => { setDraft(record?.note ?? ''); setConfirmClose(false); }, [record]);

  const dirty = Boolean(record && draft !== record.note);
  const requestClose = () => dirty ? setConfirmClose(true) : onClose();
  const save = (closeAfter = false) => {
    if (!record) return;
    onSaveNote(record.id, draft);
    if (closeAfter) onClose();
  };

  return (
    <>
      <Dialog
        id="archive-detail-dialog"
        title={record?.title ?? ''}
        eyebrow={`INTELLIGENCE RECORD / ${record?.code ?? ''}`}
        open={Boolean(record)}
        danger={record?.contamination === 'A'}
        onClose={requestClose}
        footer={<><button id="archive-detail-save" className="terminal-button is-secondary" type="button" disabled={!dirty} onClick={() => save(false)}><FloppyDisk size={16} aria-hidden />保存批注</button><button id="archive-detail-close-confirm" className="terminal-button is-primary" type="button" onClick={requestClose}>关闭档案<ArrowRight size={16} aria-hidden /></button></>}
      >
        {record ? (
          <div className="archive-dialog-content">
            <header className="archive-dialog-summary"><div><span>{record.code}</span><div><StatusBadge label={record.kind} tone="memory" /><StatusBadge label={record.verification} tone={record.verification === '存在冲突' ? 'danger' : 'success'} /></div></div><p>{record.summary}</p></header>
            <dl className="archive-detail-metadata"><div><dt>首次发现</dt><dd>{record.discoveredIn}</dd></div><div><dt>发现者</dt><dd>{record.discoveredBy}</dd></div><div><dt>可信度</dt><dd>{record.confidence}%</dd></div><div><dt>污染风险</dt><dd>{record.contamination}</dd></div><div><dt>原始来源</dt><dd>{record.sourceEntryId}</dd></div><div><dt>最后更新</dt><dd>{record.updatedAt}</dd></div></dl>
            <section className="archive-related-records"><h3><MapPin size={16} aria-hidden />关联档案</h3><div>{record.relatedIds.map((id) => { const related = allRecords.find((item) => item.id === id); return <span key={id}>{related?.title ?? id}</span>; })}</div></section>
            <section className="archive-player-note"><label htmlFor="archive-note-input"><span><NotePencil size={16} aria-hidden />玩家批注</span><small>{dirty ? '存在未保存更改' : '已同步至本地存档'}</small></label><textarea id="archive-note-input" rows={5} value={draft} onChange={(event) => setDraft(event.target.value)} /></section>
            <div className="archive-contamination-note"><ShieldWarning size={20} aria-hidden /><p><strong>情报污染说明</strong>该条记录可能受意识战场重构影响。内容不会被自动删除，冲突将保留至推理台。</p></div>
          </div>
        ) : null}
      </Dialog>
      <Dialog
        id="archive-unsaved-dialog"
        title="批注尚未保存"
        eyebrow="LOCAL CHANGE / CONFIRM"
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        footer={<><button id="archive-unsaved-continue" className="terminal-button is-secondary" type="button" onClick={() => setConfirmClose(false)}>继续编辑</button><button id="archive-unsaved-discard" className="terminal-button is-secondary" type="button" onClick={onClose}>放弃更改</button><button id="archive-unsaved-save" className="terminal-button is-primary" type="button" onClick={() => save(true)}>保存并关闭</button></>}
      ><p className="unsaved-dialog-copy">关闭档案会丢失刚才输入的玩家批注。原始 LLM 情报与其他存档不受影响。</p></Dialog>
    </>
  );
}
