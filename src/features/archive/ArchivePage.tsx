import { Archive, Books, Brain, Graph, PuzzlePiece } from '@phosphor-icons/react';
import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useGameStore } from '../../store/gameStore';
import type { ArchiveRecord } from '../../types/game';
import { ArchiveDialog } from './ArchiveDialog';
import { ArchiveFilters } from './ArchiveFilters';
import { ArchiveGrid } from './ArchiveGrid';
import { ArchiveRelationGraph } from './ArchiveRelationGraph';
import { ReasoningBoard } from './ReasoningBoard';
import { LorebookManager } from '../tavern/lorebooks/LorebookManager';
import './archive.css';

export default function ArchivePage() {
  const archive = useGameStore((state) => state.archive);
  const setArchiveView = useGameStore((state) => state.setArchiveView);
  const setArchiveQuery = useGameStore((state) => state.setArchiveQuery);
  const setArchiveKindFilter = useGameStore((state) => state.setArchiveKindFilter);
  const setArchiveSort = useGameStore((state) => state.setArchiveSort);
  const toggleArchivePin = useGameStore((state) => state.toggleArchivePin);
  const saveArchiveNote = useGameStore((state) => state.saveArchiveNote);
  const markArchiveRead = useGameStore((state) => state.markArchiveRead);
  const linkArchiveRecords = useGameStore((state) => state.linkArchiveRecords);
  const [selectedRecord, setSelectedRecord] = useState<ArchiveRecord | null>(null);
  const [relationSelection, setRelationSelection] = useState<string[]>([]);
  const memoryCompendium = useGameStore((state) => state.memoryCompendium);
  const [workspace, setWorkspace] = useState<'compendium' | 'archive' | 'lorebooks'>('compendium');

  const counts = {
    全部: archive.records.length,
    线索: archive.records.filter((record) => record.kind === '线索').length,
    人物: archive.records.filter((record) => record.kind === '人物').length,
    地点: archive.records.filter((record) => record.kind === '地点').length,
    事件: archive.records.filter((record) => record.kind === '事件').length,
    证物: archive.records.filter((record) => record.kind === '证物').length,
  };
  const query = archive.query.trim().toLocaleLowerCase('zh-CN');
  const visibleRecords = archive.records
    .filter((record) => archive.kindFilter === '全部' || record.kind === archive.kindFilter)
    .filter((record) => !query || `${record.code} ${record.title} ${record.summary}`.toLocaleLowerCase('zh-CN').includes(query))
    .sort((a, b) => archive.sort === '可信度' ? b.confidence - a.confidence : b.updatedAt.localeCompare(a.updatedAt));
  const unread = archive.records.filter((record) => record.unread).length;

  const openRecord = (record: ArchiveRecord) => {
    markArchiveRead(record.id);
    setSelectedRecord({ ...record, unread: false });
  };

  const toggleRelationSelection = (recordId: string) => {
    setRelationSelection((current) => current.includes(recordId) ? current.filter((id) => id !== recordId) : current.length >= 2 ? [current[1], recordId] : [...current, recordId]);
  };

  return (
    <section className="route-page archive-route" aria-labelledby="archive-page-title">
      <PageHeader id="archive-page-title" code="04" title="记忆图鉴" description="永久收录迷迭香在各次 Run 中找回的记忆碎片；叙事档案与世界书作为可选 LLM 资料保留。" meta={`${memoryCompendium.length} MEMORIES / ${archive.records.length} ARCHIVES`} />

      <div className="archive-view-tabs" role="tablist" aria-label="档案工作区视图">
        <button id="archive-view-compendium" type="button" role="tab" aria-label="记忆图鉴" aria-selected={workspace === 'compendium'} className={workspace === 'compendium' ? 'is-active' : ''} onClick={() => setWorkspace('compendium')}><PuzzlePiece size={17} aria-hidden />记忆图鉴<small aria-hidden="true">{memoryCompendium.length}</small></button>
        <button id="archive-view-records" type="button" role="tab" aria-label="叙事档案" aria-selected={workspace === 'archive' && archive.view === 'records'} className={workspace === 'archive' && archive.view === 'records' ? 'is-active' : ''} onClick={() => { setWorkspace('archive'); setArchiveView('records'); }}><Archive size={17} aria-hidden />叙事档案<small aria-hidden="true">{archive.records.length}</small></button>
        <button id="archive-view-relations" type="button" role="tab" aria-label="关系图" aria-selected={workspace === 'archive' && archive.view === 'relations'} className={workspace === 'archive' && archive.view === 'relations' ? 'is-active' : ''} onClick={() => { setWorkspace('archive'); setArchiveView('relations'); }}><Graph size={17} aria-hidden />关系图<small aria-hidden="true">{archive.links.length}</small></button>
        <button id="archive-view-reasoning" type="button" role="tab" aria-label="推理台" aria-selected={workspace === 'archive' && archive.view === 'reasoning'} className={workspace === 'archive' && archive.view === 'reasoning' ? 'is-active' : ''} onClick={() => { setWorkspace('archive'); setArchiveView('reasoning'); }}><Brain size={17} aria-hidden />推理台<small aria-hidden="true">{archive.records.filter((record) => record.pinned).length}</small></button>
        <button id="tavern-tab-lorebooks" type="button" role="tab" aria-label="世界书" aria-selected={workspace === 'lorebooks'} className={workspace === 'lorebooks' ? 'is-active' : ''} onClick={() => setWorkspace('lorebooks')}><Books size={17} aria-hidden />世界书<small aria-hidden="true">LLM</small></button>
      </div>

      {workspace === 'compendium' ? <MemoryCompendium entries={memoryCompendium} /> : null}
      {workspace === 'archive' && archive.view === 'records' ? <><ArchiveFilters query={archive.query} kind={archive.kindFilter} sort={archive.sort} counts={counts} onQuery={setArchiveQuery} onKind={setArchiveKindFilter} onSort={setArchiveSort} /><ArchiveGrid records={visibleRecords} onOpen={openRecord} onTogglePin={toggleArchivePin} /></> : null}
      {workspace === 'archive' && archive.view === 'relations' ? <ArchiveRelationGraph records={archive.records} links={archive.links} selectedIds={relationSelection} onToggleSelect={toggleRelationSelection} onCreateLink={() => { if (relationSelection.length === 2) linkArchiveRecords(relationSelection[0], relationSelection[1]); setRelationSelection([]); }} /> : null}
      {workspace === 'archive' && archive.view === 'reasoning' ? <ReasoningBoard records={archive.records} /> : null}
      {workspace === 'lorebooks' ? <LorebookManager /> : null}

      <ArchiveDialog record={selectedRecord ? archive.records.find((record) => record.id === selectedRecord.id) ?? selectedRecord : null} allRecords={archive.records} onClose={() => setSelectedRecord(null)} onSaveNote={saveArchiveNote} />
    </section>
  );
}

function MemoryCompendium({ entries }: { entries: import('../../types/game').MemoryCompendiumEntry[] }) {
  return (
    <section className="memory-compendium" role="region" aria-labelledby="memory-compendium-title">
      <header>
        <div><span className="panel-code">RECOVERED MEMORY / PERMANENT</span><h2 id="memory-compendium-title">已找回的记忆碎片</h2></div>
        <p>图鉴跨 Run 保留；遗忘只影响当前局的碎片槽位。</p>
      </header>
      {entries.length ? (
        <div className="memory-compendium-grid">
          {entries.map((entry, index) => (
            <article id={`memory-compendium-entry-${entry.id}`} key={entry.id}>
              <span>MEM-{String(index + 1).padStart(3, '0')}</span>
              <strong>{entry.name}</strong>
              <p>{entry.kind === 'core' ? '核心记忆' : entry.kind === 'emotion' ? '情感碎片' : entry.kind === 'pain' ? '痛苦碎片' : '技能碎片'} · 已回收 {entry.discoveries} 次</p>
              <div>{entry.tags.length ? entry.tags.map((tag) => <small key={tag}>{tag}</small>) : <small>未分类</small>}</div>
              <footer>首次发现于 {entry.discoveredRunId}</footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="memory-compendium-empty">
          <PuzzlePiece size={28} aria-hidden />
          <strong>图鉴尚未记录碎片</strong>
          <p>完成迷宫节点并保留记忆碎片后，条目会永久出现在这里。</p>
        </div>
      )}
    </section>
  );
}
