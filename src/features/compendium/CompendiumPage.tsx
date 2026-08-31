import { Puzzle } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useGameStore } from '../../store/gameStore';
import type { MemoryCompendiumEntry } from '../../types/game';
import './compendium.css';

export default function CompendiumPage() {
  const entries = useGameStore((state) => state.memoryCompendium);

  return (
    <section className="route-page compendium-route" aria-labelledby="compendium-page-title">
      <PageHeader
        id="compendium-page-title"
        code="02"
        title="记忆图鉴"
        description="永久收录迷迭香在各次探索中找回的记忆碎片。"
        meta={`${entries.length} RECOVERED MEMORIES`}
      />
      <MemoryCompendium entries={entries} />
    </section>
  );
}

function MemoryCompendium({ entries }: { entries: MemoryCompendiumEntry[] }) {
  return (
    <section className="memory-compendium" role="region" aria-labelledby="memory-compendium-title">
      <header>
        <div>
          <span className="panel-code">RECOVERED MEMORY / PERMANENT</span>
          <h2 id="memory-compendium-title">已找回的记忆碎片</h2>
        </div>
        <p>图鉴跨 Run 保留；遗忘只影响当前局的碎片槽位。</p>
      </header>
      {entries.length ? (
        <div className="memory-compendium-grid">
          {entries.map((entry, index) => (
            <article id={`memory-compendium-entry-${entry.id}`} key={entry.id}>
              <span>MEM-{String(index + 1).padStart(3, '0')}</span>
              <strong>{entry.name}</strong>
              <p>{fragmentKindLabel(entry.kind)} · 已回收 {entry.discoveries} 次</p>
              <div>
                {entry.tags.length
                  ? entry.tags.map((tag) => <small key={tag}>{tag}</small>)
                  : <small>未分类</small>}
              </div>
              <footer>首次发现于 {entry.discoveredRunId}</footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="memory-compendium-empty">
          <Puzzle size={28} aria-hidden />
          <strong>图鉴尚未记录碎片</strong>
          <p>完成迷宫节点并保留记忆碎片后，条目会永久出现在这里。</p>
        </div>
      )}
    </section>
  );
}

function fragmentKindLabel(kind: MemoryCompendiumEntry['kind']): string {
  if (kind === 'core') return '核心记忆';
  if (kind === 'emotion') return '情感碎片';
  if (kind === 'pain') return '痛苦碎片';
  return '技能碎片';
}
