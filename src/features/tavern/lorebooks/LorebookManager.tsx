import { BookOpenText, DownloadSimple, PencilSimple, Plus, Trash, UploadSimple } from '@phosphor-icons/react';
import { useState, type ChangeEvent } from 'react';
import { Dialog } from '../../../components/Dialog';
import { createDefaultLorebook, exportLorebook, exportToJson, importLorebook, type Lorebook, type SillyTavernLorebookExport } from '../../../sillytavern';
import { useTavern } from '../runtime/useTavern';
import { LorebookEditorDialog } from './LorebookEditorDialog';
import '../components/tavern-components.css';

export function LorebookManager() {
  const runtime = useTavern();
  const [editing, setEditing] = useState<Lorebook | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lorebook | null>(null);
  const [report, setReport] = useState('');

  const importBooks = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    let successes = 0;
    const failures: string[] = [];
    for (const file of files) {
      try {
        const imported = importLorebook(JSON.parse(await file.text()) as SillyTavernLorebookExport);
        const now = Date.now();
        await runtime.upsertLorebook({ ...imported, id: crypto.randomUUID(), createdAt: now, updatedAt: now });
        successes += 1;
      } catch {
        failures.push(file.name);
      }
    }
    setReport(`导入完成：成功 ${successes} 项，失败 ${failures.length} 项${failures.length ? `；失败文件 ${failures.join('、')}` : ''}。`);
  };

  const toggle = async (id: string) => {
    if (!runtime.settings) return;
    const active = runtime.settings.activeLorebookIds.includes(id);
    await runtime.updateSettings({
      ...runtime.settings,
      activeLorebookIds: active
        ? runtime.settings.activeLorebookIds.filter((item) => item !== id)
        : [...runtime.settings.activeLorebookIds, id],
    });
  };

  const create = () => setEditing(createDefaultLorebook(`新世界书 ${String(runtime.lorebooks.length + 1).padStart(2, '0')}`));

  return (
    <section id="tavern-panel-lorebooks" className="tavern-panel-stack" role="tabpanel" aria-labelledby="tavern-tab-lorebooks">
      <header className="tavern-section-heading">
        <div><span className="panel-code">WORLD INFO / MATCH ENGINE</span><h3>世界书索引</h3><p>关键词命中将按优先级与注入位置进入上下文；预览区使用与正式生成相同的扫描引擎。</p></div>
        <div className="tavern-toolbar">
          <label id="lorebook-import-trigger" className="terminal-button" htmlFor="lorebook-import-input"><UploadSimple size={16} aria-hidden />批量导入</label>
          <input id="lorebook-import-input" className="visually-hidden" type="file" multiple accept=".json,application/json" aria-label="批量导入世界书 JSON" onChange={(event) => void importBooks(event)} />
          <button id="lorebook-create-button" className="terminal-button is-primary" type="button" onClick={create}><Plus size={16} aria-hidden />新建世界书</button>
        </div>
      </header>
      {report ? <p className="tavern-import-report" role="status">{report}</p> : null}
      <div className="tavern-asset-grid">
        {runtime.lorebooks.map((book) => {
          const active = runtime.settings?.activeLorebookIds.includes(book.id) ?? false;
          return (
            <article key={book.id} aria-label={`世界书 ${book.name}`} className={active ? 'is-active' : ''}>
              <div className="tavern-asset-icon"><BookOpenText size={24} aria-hidden /></div>
              <div className="tavern-asset-copy">
                <strong>{book.name}</strong>
                <p>{book.description || `${book.entries.length} 条世界情报规则等待扫描。`}</p>
                <span>{book.entries.length} ENTRIES · {book.recursiveScanning ? 'RECURSIVE' : 'DIRECT'}</span>
              </div>
              <div className="tavern-asset-actions">
                <button id={`lorebook-toggle-${book.id}`} type="button" aria-pressed={active} onClick={() => void toggle(book.id)}>{active ? '已启用' : '启用'}</button>
                <button id={`lorebook-edit-${book.id}`} type="button" aria-label={`编辑世界书 ${book.name}`} onClick={() => setEditing(book)}><PencilSimple size={16} aria-hidden /></button>
                <button id={`lorebook-export-${book.id}`} type="button" aria-label={`导出世界书 ${book.name}`} onClick={() => exportToJson(exportLorebook(book), `${safeName(book.name)}.json`)}><DownloadSimple size={16} aria-hidden /></button>
                <button id={`lorebook-delete-${book.id}`} type="button" aria-label={`删除世界书 ${book.name}`} onClick={() => setDeleteTarget(book)}><Trash size={16} aria-hidden /></button>
              </div>
            </article>
          );
        })}
      </div>
      <LorebookEditorDialog lorebook={editing} open={Boolean(editing)} onClose={() => setEditing(null)} onSave={runtime.upsertLorebook} />
      <Dialog
        id="lorebook-delete-dialog"
        title="确认删除世界书"
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        danger
        footer={<>
          <button id="lorebook-delete-cancel" className="terminal-button" type="button" onClick={() => setDeleteTarget(null)}>取消</button>
          <button id="lorebook-delete-confirm" className="terminal-button is-danger" type="button" onClick={() => { if (deleteTarget) void runtime.removeLorebook(deleteTarget.id); setDeleteTarget(null); }}>确认删除</button>
        </>}
      >
        <p>该世界书及其全部条目将从本机移除，历史消息保持不变。</p>
      </Dialog>
    </section>
  );
}

function safeName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}
