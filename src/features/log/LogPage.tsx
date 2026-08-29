import {
  ClockCounterClockwise,
  Funnel,
  GitBranch,
  MagnifyingGlass,
  ShieldCheck,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useGameStore } from '../../store/gameStore';
import type { ActionLogEntry } from '../../types/game';
import { useTavern } from '../tavern/runtime/useTavern';
import { ActionTimeline } from './ActionTimeline';
import { ReplayDialog } from './ReplayDialog';
import { SessionBranchTree } from './SessionBranchTree';
import './log.css';

type LogWorkspace = 'sessions' | 'timeline';

export default function LogPage() {
  const actionLog = useGameStore((state) => state.actionLog);
  const narrative = useGameStore((state) => state.narrative.entries);
  const tavern = useTavern();
  const [workspace, setWorkspace] = useState<LogWorkspace>('sessions');
  const [kind, setKind] = useState<ActionLogEntry['kind'] | '全部'>('全部');
  const [actor, setActor] = useState('全部');
  const [query, setQuery] = useState('');
  const [replayEntry, setReplayEntry] = useState<ActionLogEntry | null>(null);
  const visible = actionLog
    .filter((entry) => kind === '全部' || entry.kind === kind)
    .filter((entry) => actor === '全部' || entry.actor === actor)
    .filter((entry) => !query || `${entry.title}${entry.summary}`.includes(query));
  const actors = ['全部', ...new Set(actionLog.map((entry) => entry.actor))];

  return (
    <section className="route-page log-route" aria-labelledby="log-page-title">
      <PageHeader
        id="log-page-title"
        code="05"
        title="行动记录"
        description="管理酒馆会话树与战术时间线。分支保留精确来源消息，所有投影结果均可回到原始剧情。"
        meta={`${String(tavern.chats.length).padStart(2, '0')} SESSIONS / ${String(actionLog.length).padStart(2, '0')} RECORDS`}
        actions={<span className="log-integrity"><ShieldCheck size={16} weight="fill" aria-hidden />记录完整性 100%</span>}
      />

      <div className="log-workspace-tabs">
        <SegmentedControl
          id="log-workspace-tabs"
          label="行动记录工作区"
          value={workspace}
          mode="tabs"
          items={[
            { value: 'sessions', label: '会话分支', panelId: 'log-panel-sessions', icon: <GitBranch size={17} aria-hidden /> },
            { value: 'timeline', label: '战术时间线', panelId: 'log-panel-timeline', icon: <ClockCounterClockwise size={17} aria-hidden /> },
          ]}
          onChange={setWorkspace}
        />
        <span>{workspace === 'sessions' ? 'SESSION GRAPH / LOCAL' : 'TACTICAL PROJECTION / ASC'}</span>
      </div>

      {workspace === 'sessions' ? (
        <section id="log-panel-sessions" className="log-session-panel" role="tabpanel" aria-labelledby="log-workspace-tabs-sessions">
          <header className="log-section-heading">
            <div><span className="panel-code">BRANCH TOPOLOGY / TRACEABLE</span><h2>会话分支图</h2></div>
            <span>{tavern.activeChat?.name ?? '未载入会话'}</span>
          </header>
          <div className="log-session-layout">
            <div className="session-tree-viewport"><SessionBranchTree /></div>
            <SessionSummary actionLog={actionLog} sessionCount={tavern.chats.length} />
          </div>
        </section>
      ) : (
        <section id="log-panel-timeline" role="tabpanel" aria-labelledby="log-workspace-tabs-timeline">
          <section className="log-filters" aria-label="行动记录筛选">
            <label htmlFor="log-search-input">
              <MagnifyingGlass size={17} aria-hidden />
              <span className="sr-only">搜索行动记录</span>
              <input id="log-search-input" value={query} placeholder="搜索指令、检定或状态" onChange={(event) => setQuery(event.target.value)} />
            </label>
            <div role="group" aria-label="记录类型">
              <Funnel size={15} aria-hidden />
              <button id="log-filter-all" type="button" className={kind === '全部' ? 'is-active' : ''} onClick={() => setKind('全部')}>全部记录</button>
              <button id="log-filter-check" type="button" className={kind === '检定' ? 'is-active' : ''} onClick={() => setKind('检定')}>仅显示检定</button>
              <button id="log-filter-command" type="button" className={kind === '指令' ? 'is-active' : ''} onClick={() => setKind('指令')}>玩家指令</button>
              <button id="log-filter-change" type="button" className={kind === '状态变化' ? 'is-active' : ''} onClick={() => setKind('状态变化')}>状态变化</button>
            </div>
            <label htmlFor="log-actor-select">
              <span>执行者</span>
              <select id="log-actor-select" value={actor} onChange={(event) => setActor(event.target.value)}>{actors.map((item) => <option key={item}>{item}</option>)}</select>
            </label>
          </section>
          <div className="log-workbench">
            <section aria-labelledby="log-timeline-title">
              <header className="log-section-heading">
                <div><span className="panel-code">IMMUTABLE TIMELINE / ASC</span><h2 id="log-timeline-title">第一章 · 失温病历</h2></div>
                <span>{visible.length} / {actionLog.length}</span>
              </header>
              <ActionTimeline entries={visible} onOpen={setReplayEntry} />
            </section>
            <SessionSummary actionLog={actionLog} sessionCount={tavern.chats.length} />
          </div>
        </section>
      )}

      <ReplayDialog entry={replayEntry} narrative={narrative} onClose={() => setReplayEntry(null)} />
    </section>
  );
}

function SessionSummary({ actionLog, sessionCount }: { actionLog: ActionLogEntry[]; sessionCount: number }) {
  return (
    <aside className="log-summary">
      <span className="panel-code">SESSION METRICS</span>
      <h2>本次行动摘要</h2>
      <dl>
        <div><dt>酒馆会话</dt><dd>{sessionCount}</dd></div>
        <div><dt>玩家指令</dt><dd>{actionLog.filter((entry) => entry.kind === '指令').length}</dd></div>
        <div><dt>属性检定</dt><dd>{actionLog.filter((entry) => entry.kind === '检定').length}</dd></div>
        <div><dt>节点解锁</dt><dd>{actionLog.filter((entry) => entry.kind === '节点解锁').length}</dd></div>
        <div><dt>情报入库</dt><dd>{actionLog.filter((entry) => entry.kind === '情报入库').length}</dd></div>
      </dl>
      <div className="log-hash"><span>存档校验</span><code>RHO-0317-A7C9</code><small>仅本地演示数据</small></div>
    </aside>
  );
}
