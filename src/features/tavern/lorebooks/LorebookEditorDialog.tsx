import { NotePencil, Plus, Trash } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '../../../components/Dialog';
import { createDefaultEntry, removeEntry, updateEntry, type Lorebook, type LorebookEntry } from '../../../sillytavern';
import { paginateItems, TAVERN_PAGE_SIZE } from '../components/pagination';
import { EntryForm } from './EntryForm';
import { KeywordPreview } from './KeywordPreview';

export function LorebookEditorDialog({ lorebook, open, onClose, onSave }: { lorebook: Lorebook | null; open: boolean; onClose: () => void; onSave: (book: Lorebook) => Promise<void> }) {
  const [draft, setDraft] = useState<Lorebook | null>(lorebook);
  const [selectedId, setSelectedId] = useState<string | null>(lorebook?.entries[0]?.id ?? null);
  const [error, setError] = useState('');
  const [entryPage, setEntryPage] = useState(1);

  useEffect(() => {
    if (open && lorebook) {
      const next = structuredClone(lorebook);
      setDraft(next);
      setSelectedId(next.entries[0]?.id ?? null);
      setError('');
      setEntryPage(1);
    }
  }, [lorebook, open]);

  const selected = useMemo(() => draft?.entries.find((entry) => entry.id === selectedId) ?? null, [draft, selectedId]);
  if (!draft) return null;
  const paginatedEntries = paginateItems(draft.entries, entryPage);

  const patchEntry = (patch: Partial<LorebookEntry>) => {
    if (selected) setDraft((current) => current ? updateEntry(current, selected.id, patch) : current);
  };
  const addEntry = () => {
    const entry = createDefaultEntry();
    setDraft((current) => current ? { ...current, entries: [...current.entries, entry], updatedAt: Date.now() } : current);
    setSelectedId(entry.id);
    setEntryPage(Math.ceil((draft.entries.length + 1) / TAVERN_PAGE_SIZE));
  };
  const deleteEntry = (id: string) => {
    setDraft((current) => current ? removeEntry(current, id) : current);
    setSelectedId((current) => current === id ? draft.entries.find((entry) => entry.id !== id)?.id ?? null : current);
  };
  const save = async () => {
    if (!draft.name.trim()) {
      setError('世界书名称不能为空');
      return;
    }
    await onSave({ ...draft, name: draft.name.trim(), updatedAt: Date.now() });
    onClose();
  };

  return (
    <Dialog
      id="lorebook-editor-dialog"
      title="世界书编辑器"
      open={open}
      onClose={onClose}
      eyebrow="LOREBOOK / RECURSIVE SCAN"
      closeOnEscape={false}
      footer={<>
        <button id="lorebook-editor-cancel" className="terminal-button" type="button" onClick={onClose}>取消</button>
        <button id="lorebook-editor-save" className="terminal-button is-primary" type="button" onClick={() => void save()}>保存世界书</button>
      </>}
    >
      <div className="tavern-lorebook-editor">
        <aside>
          <label htmlFor="lorebook-editor-name">世界书名称
            <input id="lorebook-editor-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </label>
          <button id="lorebook-entry-create" className="terminal-button" type="button" onClick={addEntry}><Plus size={15} aria-hidden />新建条目</button>
          <div className="tavern-entry-list">
            {paginatedEntries.items.map((entry, visibleIndex) => {
              const index = paginatedEntries.start + visibleIndex;
              return (
              <article key={entry.id} className={entry.id === selectedId ? 'is-active' : ''}>
                <button id={`lorebook-entry-${entry.id}-select`} type="button" onClick={() => setSelectedId(entry.id)}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{entry.comment || entry.keys.join(' / ') || '未命名条目'}</strong><small>{entry.position} · {entry.constant ? '常驻' : `${entry.probability}%`}</small></div>
                </button>
                <button id={`lorebook-entry-${entry.id}-delete`} type="button" aria-label={`删除条目 ${entry.comment || index + 1}`} onClick={() => deleteEntry(entry.id)}><Trash size={15} aria-hidden /></button>
              </article>
              );
            })}
          </div>
          {paginatedEntries.pageCount > 1 ? <nav className="tavern-list-pagination" aria-label="世界书条目分页">
            <button id="lorebook-entry-page-previous" type="button" disabled={paginatedEntries.page === 1} onClick={() => setEntryPage(paginatedEntries.page - 1)}>上一页</button>
            <output id="lorebook-entry-page-status">{paginatedEntries.start + 1}–{paginatedEntries.end} / {paginatedEntries.total}</output>
            <button id="lorebook-entry-page-next" type="button" disabled={paginatedEntries.page === paginatedEntries.pageCount} onClick={() => setEntryPage(paginatedEntries.page + 1)}>下一页</button>
          </nav> : null}
          <div className="tavern-toggle-grid">
            <label className="tavern-toggle" htmlFor="lorebook-recursive-scan"><input id="lorebook-recursive-scan" type="checkbox" checked={draft.recursiveScanning} onChange={(event) => setDraft({ ...draft, recursiveScanning: event.target.checked })} /><span>递归扫描</span></label>
            <label className="tavern-toggle" htmlFor="lorebook-case-sensitive"><input id="lorebook-case-sensitive" type="checkbox" checked={draft.caseSensitive} onChange={(event) => setDraft({ ...draft, caseSensitive: event.target.checked })} /><span>区分大小写</span></label>
            <label className="tavern-toggle" htmlFor="lorebook-whole-word"><input id="lorebook-whole-word" type="checkbox" checked={draft.matchWholeWords} onChange={(event) => setDraft({ ...draft, matchWholeWords: event.target.checked })} /><span>全词匹配</span></label>
          </div>
        </aside>
        <main>
          {selected ? <>
            <div className="tavern-editor-band"><NotePencil size={18} aria-hidden /><span>ENTRY / {selected.id.slice(0, 8).toUpperCase()}</span></div>
            <EntryForm value={selected} onChange={patchEntry} />
          </> : <div className="tavern-empty-state">选择左侧条目，或新建一条情报规则。</div>}
          <KeywordPreview lorebook={draft} />
          {error ? <p role="alert" className="tavern-form-error">{error}</p> : null}
        </main>
      </div>
    </Dialog>
  );
}
