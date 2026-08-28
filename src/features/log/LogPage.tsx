import { Funnel, MagnifyingGlass, ShieldCheck } from '@phosphor-icons/react';
import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useGameStore } from '../../store/gameStore';
import type { ActionLogEntry } from '../../types/game';
import { ActionTimeline } from './ActionTimeline';
import { ReplayDialog } from './ReplayDialog';
import './log.css';

export default function LogPage() {
  const actionLog = useGameStore((state) => state.actionLog);
  const narrative = useGameStore((state) => state.narrative.entries);
  const [kind, setKind] = useState<ActionLogEntry['kind'] | '全部'>('全部');
  const [actor, setActor] = useState('全部');
  const [query, setQuery] = useState('');
  const [replayEntry, setReplayEntry] = useState<ActionLogEntry | null>(null);
  const visible = actionLog.filter((entry) => kind === '全部' || entry.kind === kind).filter((entry) => actor === '全部' || entry.actor === actor).filter((entry) => !query || `${entry.title}${entry.summary}`.includes(query));
  const actors = ['全部', ...new Set(actionLog.map((entry) => entry.actor))];

  return (
    <section className="route-page log-route" aria-labelledby="log-page-title">
      <PageHeader id="log-page-title" code="05" title="行动记录" description="按时间追溯章节、玩家指令、检定、状态变化、节点解锁与情报入库，保留每个结果的原始剧情来源。" meta={`${String(actionLog.length).padStart(2, '0')} RECORDS / CHAPTER 01`} actions={<span className="log-integrity"><ShieldCheck size={16} weight="fill" aria-hidden />记录完整性 100%</span>} />
      <section className="log-filters" aria-label="行动记录筛选">
        <label htmlFor="log-search-input"><MagnifyingGlass size={17} aria-hidden /><span className="sr-only">搜索行动记录</span><input id="log-search-input" value={query} placeholder="搜索指令、检定或状态" onChange={(event) => setQuery(event.target.value)} /></label>
        <div role="group" aria-label="记录类型"><Funnel size={15} aria-hidden /><button id="log-filter-all" type="button" className={kind === '全部' ? 'is-active' : ''} onClick={() => setKind('全部')}>全部记录</button><button id="log-filter-check" type="button" className={kind === '检定' ? 'is-active' : ''} onClick={() => setKind('检定')}>仅显示检定</button><button id="log-filter-command" type="button" className={kind === '指令' ? 'is-active' : ''} onClick={() => setKind('指令')}>玩家指令</button><button id="log-filter-change" type="button" className={kind === '状态变化' ? 'is-active' : ''} onClick={() => setKind('状态变化')}>状态变化</button></div>
        <label htmlFor="log-actor-select"><span>执行者</span><select id="log-actor-select" value={actor} onChange={(event) => setActor(event.target.value)}>{actors.map((item) => <option key={item}>{item}</option>)}</select></label>
      </section>
      <div className="log-workbench"><section aria-labelledby="log-timeline-title"><header className="log-section-heading"><div><span className="panel-code">IMMUTABLE TIMELINE / ASC</span><h2 id="log-timeline-title">第一章 · 失温病历</h2></div><span>{visible.length} / {actionLog.length}</span></header><ActionTimeline entries={visible} onOpen={setReplayEntry} /></section><aside className="log-summary"><span className="panel-code">SESSION METRICS</span><h2>本次行动摘要</h2><dl><div><dt>玩家指令</dt><dd>{actionLog.filter((entry) => entry.kind === '指令').length}</dd></div><div><dt>属性检定</dt><dd>{actionLog.filter((entry) => entry.kind === '检定').length}</dd></div><div><dt>节点解锁</dt><dd>{actionLog.filter((entry) => entry.kind === '节点解锁').length}</dd></div><div><dt>情报入库</dt><dd>{actionLog.filter((entry) => entry.kind === '情报入库').length}</dd></div></dl><div className="log-hash"><span>存档校验</span><code>RHO-0317-A7C9</code><small>仅本地演示数据</small></div></aside></div>
      <ReplayDialog entry={replayEntry} narrative={narrative} onClose={() => setReplayEntry(null)} />
    </section>
  );
}
