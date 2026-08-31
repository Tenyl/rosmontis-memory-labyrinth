import {
  Filter as Funnel,
  Search as MagnifyingGlass,
  ArrowUpAZ as SortAscending,
} from 'lucide-react';
import type { ArchiveKind } from '../../types/game';

interface ArchiveFiltersProps {
  query: string;
  kind: ArchiveKind | '全部';
  sort: '最近更新' | '可信度';
  counts: Record<ArchiveKind | '全部', number>;
  onQuery: (query: string) => void;
  onKind: (kind: ArchiveKind | '全部') => void;
  onSort: (sort: '最近更新' | '可信度') => void;
}

const kinds: Array<ArchiveKind | '全部'> = ['全部', '线索', '人物', '地点', '事件', '证物'];
const kindSlug: Record<ArchiveKind | '全部', string> = {
  全部: 'all',
  线索: 'clue',
  人物: 'character',
  地点: 'location',
  事件: 'event',
  证物: 'evidence',
};

export function ArchiveFilters({ query, kind, sort, counts, onQuery, onKind, onSort }: ArchiveFiltersProps) {
  return (
    <section className="archive-filters" aria-label="档案筛选器">
      <label className="archive-search" htmlFor="archive-search-input"><MagnifyingGlass size={18} aria-hidden /><span className="sr-only">搜索档案</span><input id="archive-search-input" type="search" value={query} placeholder="搜索档案编号、名称或摘要" onChange={(event) => onQuery(event.target.value)} /></label>
      <div className="archive-kind-filters" role="group" aria-label="档案类型"><Funnel size={16} aria-hidden />{kinds.map((item) => <button id={`archive-filter-${kindSlug[item]}`} key={item} type="button" className={kind === item ? 'is-active' : ''} aria-label={item} aria-pressed={kind === item} onClick={() => onKind(item)}>{item}<small aria-hidden="true">{counts[item]}</small></button>)}</div>
      <label className="archive-sort" htmlFor="archive-sort-select"><SortAscending size={16} aria-hidden /><span>排序</span><select id="archive-sort-select" value={sort} onChange={(event) => onSort(event.target.value as '最近更新' | '可信度')}><option>最近更新</option><option>可信度</option></select></label>
    </section>
  );
}
