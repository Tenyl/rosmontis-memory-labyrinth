import { BookOpenText, FloppyDisk, NotePencil } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { resolveImageAsset } from '../../assets/assetRegistry';
import { listDiaryEntries, updateDoctorNote } from '../../diary/repository';
import type { DiaryEntry } from '../../diary/types';
import './diary.css';

export function DiaryPanel() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'saved' | 'failed'>('loading');
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;

  useEffect(() => {
    let active = true;
    void listDiaryEntries()
      .then((next) => {
        if (!active) return;
        setEntries(next);
        setStatus('ready');
      })
      .catch(() => active && setStatus('failed'));
    return () => { active = false; };
  }, []);

  const openEntry = (entry: DiaryEntry) => {
    setSelectedId(entry.id);
    setNote(entry.doctorNote);
    setStatus('ready');
  };

  const saveNote = async () => {
    if (!selected) return;
    setStatus('saving');
    try {
      await updateDoctorNote(selected.id, note);
      setEntries((current) => current.map((entry) => entry.id === selected.id ? { ...entry, doctorNote: note } : entry));
      setStatus('saved');
    } catch {
      setStatus('failed');
    }
  };

  return (
    <section className="diary-panel" aria-labelledby="diary-panel-title">
      <header>
        <div><span className="panel-code">ROSMONTIS / PRIVATE MEMORY</span><h2 id="diary-panel-title">迷迭香手记簿</h2></div>
        <p>关键节点、层级结算与被抄录的记忆会留在这里。博士可以在每一页末尾写下批注。</p>
      </header>

      {status === 'failed' && entries.length === 0 ? (
        <div className="diary-empty is-error" role="alert"><BookOpenText size={30} aria-hidden /><strong>手记读取失败</strong><p>IndexedDB 暂时不可用，请检查浏览器存储权限后重试。局内进度没有受到影响。</p></div>
      ) : entries.length === 0 && status !== 'loading' ? (
        <div className="diary-empty"><BookOpenText size={30} aria-hidden /><strong>手记还没有写下第一行</strong><p>完成守门节点、探索完一层，或把溢出的碎片抄录下来后，这里会出现第一篇日记。</p></div>
      ) : (
        <div className="diary-workspace">
          <nav aria-label="手记条目列表">
            {entries.map((entry) => (
              <button id={`btn-diary-entry-${entry.id}`} key={entry.id} type="button" className={entry.id === selectedId ? 'is-active' : ''} onClick={() => openEntry(entry)} aria-label={`打开手记：${entry.title}`}>
                <span>FLOOR {String(entry.floor).padStart(2, '0')}</span><strong>{entry.title}</strong><small>{entry.source === 'remote' ? 'LLM 生成' : '本地预设'}</small>
              </button>
            ))}
          </nav>
          <article className="diary-page">
            {selected ? (
              <>
                <img src={resolveImageAsset(selected.illustrationAssetId)} alt="迷迭香手记插图资源占位图" />
                <div className="diary-page-source"><span>{selected.source === 'remote' ? 'LLM 生成' : '本地预设'}</span><time dateTime={selected.createdAt}>{formatDate(selected.createdAt)}</time></div>
                <h3>{selected.title}</h3>
                <p>{selected.body}</p>
                <label htmlFor="diary-doctor-note"><span><NotePencil size={16} aria-hidden />博士的批注</span></label>
                <textarea id="diary-doctor-note" aria-label="博士的批注" value={note} maxLength={500} rows={5} onChange={(event) => setNote(event.target.value)} placeholder="写下想让迷迭香记住的话……" />
                <footer><small>{status === 'saved' ? '批注已保存' : status === 'failed' ? '保存失败，请稍后重试' : `${note.length} / 500`}</small><button id="btn-diary-save-note" type="button" onClick={() => void saveNote()} disabled={status === 'saving'}><FloppyDisk size={16} aria-hidden />保存博士的批注</button></footer>
              </>
            ) : (
              <div className="diary-page-prompt"><BookOpenText size={32} aria-hidden /><strong>选择一篇手记</strong><p>这里会显示迷迭香的正文、来源与博士批注。</p></div>
            )}
          </article>
        </div>
      )}
    </section>
  );
}

function formatDate(value: string): string {
  if (value === 'pending-write') return '等待写入';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}
