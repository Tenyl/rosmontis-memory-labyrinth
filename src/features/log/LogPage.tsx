import {
  ClockCounterClockwise,
  Funnel,
  GitBranch,
  MagnifyingGlass,
  Scroll,
  ShieldCheck,
  TerminalWindow,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useGameStore } from '../../store/gameStore';
import type { ActionLogEntry } from '../../types/game';
import type { RuleEvent } from '../../game/types';
import type { RunHistoryRecord } from '../../types/game';
import { useTavern } from '../tavern/runtime/useTavern';
import { ActionTimeline } from './ActionTimeline';
import { ReplayDialog } from './ReplayDialog';
import { SessionBranchTree } from './SessionBranchTree';
import './log.css';

type LogWorkspace = 'runs' | 'rules' | 'sessions' | 'timeline';

export default function LogPage() {
  const actionLog = useGameStore((state) => state.actionLog);
  const runHistory = useGameStore((state) => state.runHistory);
  const ruleLog = useGameStore((state) => state.ruleLog);
  const narrative = useGameStore((state) => state.narrative.entries);
  const tavern = useTavern();
  const [workspace, setWorkspace] = useState<LogWorkspace>('runs');
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
        description="保存每次逃离或链路中断的 Run 摘要，并提供当前局本地规则日志与可选 LLM 会话溯源。"
        meta={`${String(runHistory.length).padStart(2, '0')} RUNS / ${String(ruleLog.length).padStart(2, '0')} RULE EVENTS`}
        actions={<span className="log-integrity"><ShieldCheck size={16} weight="fill" aria-hidden />记录完整性 100%</span>}
      />

      <div className="log-workspace-tabs">
        <SegmentedControl
          id="log-workspace-tabs"
          label="行动记录工作区"
          value={workspace}
          mode="tabs"
          items={[
            { value: 'runs', label: 'Run 历史', panelId: 'log-panel-runs', icon: <Scroll size={17} aria-hidden /> },
            { value: 'rules', label: '局内规则日志', panelId: 'log-panel-rules', icon: <TerminalWindow size={17} aria-hidden /> },
            { value: 'sessions', label: '会话分支', panelId: 'log-panel-sessions', icon: <GitBranch size={17} aria-hidden /> },
            { value: 'timeline', label: '战术时间线', panelId: 'log-panel-timeline', icon: <ClockCounterClockwise size={17} aria-hidden /> },
          ]}
          onChange={setWorkspace}
        />
        <span>{workspace === 'runs' ? 'RUN ARCHIVE / LOCAL'
          : workspace === 'rules' ? 'RULE EVENTS / CURRENT RUN'
          : workspace === 'sessions' ? 'SESSION GRAPH / LOCAL'
          : 'TACTICAL PROJECTION / ASC'}</span>
      </div>

      {workspace === 'runs' ? <RunHistoryPanel records={runHistory} /> : null}
      {workspace === 'rules' ? <RuleLogPanel events={ruleLog} /> : null}
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
      ) : workspace === 'timeline' ? (
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
      ) : null}

      <ReplayDialog entry={replayEntry} narrative={narrative} onClose={() => setReplayEntry(null)} />
    </section>
  );
}

function RunHistoryPanel({ records }: { records: RunHistoryRecord[] }) {
  return (
    <section id="log-panel-runs" className="run-history-panel" role="region" aria-labelledby="run-history-title">
      <header className="log-section-heading">
        <div><span className="panel-code">RUN ARCHIVE / TERMINAL STATES</span><h2 id="run-history-title">Run 历史</h2></div>
        <span>{records.length} 次终局</span>
      </header>
      {records.length ? (
        <ol className="run-history-list">
          {[...records].reverse().map((record, index) => (
            <li id={`run-history-record-${record.id}`} key={record.id} className={`is-${record.result}`}>
              <span>#{String(records.length - index).padStart(3, '0')}</span>
              <div><strong>{record.seed}</strong><small>{modeLabel(record.mode)} · 第 {record.floor} 层 · {record.recordedAt}</small></div>
              <dl>
                <div><dt>终局</dt><dd>{record.result === 'victory' ? '成功逃离' : '链路中断'}</dd></div>
                <div><dt>回合</dt><dd>{record.turns}</dd></div>
                <div><dt>节点</dt><dd>{record.completedNodes}</dd></div>
                <div><dt>碎片</dt><dd>{record.fragmentsRecovered}</dd></div>
                <div><dt>稳定性</dt><dd>{record.finalSanity}</dd></div>
                <div><dt>过载</dt><dd>{record.finalOverload}%</dd></div>
              </dl>
            </li>
          ))}
        </ol>
      ) : <div className="run-history-empty"><strong>尚无终局记录</strong><p>成功逃离或认知链路中断后，本次 Run 会写入这里。</p></div>}
    </section>
  );
}

function RuleLogPanel({ events }: { events: RuleEvent[] }) {
  return (
    <section id="log-panel-rules" className="rule-log-panel" role="region" aria-labelledby="rule-log-title">
      <header className="log-section-heading">
        <div><span className="panel-code">DETERMINISTIC RULE TRACE / ASC</span><h2 id="rule-log-title">局内规则日志</h2></div>
        <span>{events.length} 条事件</span>
      </header>
      {events.length ? (
        <ol className="rule-log-list">
          {events.map((event, index) => (
            <li id={`rule-log-entry-${index + 1}`} key={`${event.type}-${index}`}>
              <span>{String(index + 1).padStart(3, '0')}</span>
              <strong>{ruleEventLabel(event)}</strong>
              <code>{JSON.stringify(event)}</code>
            </li>
          ))}
        </ol>
      ) : <div className="run-history-empty"><strong>当前 Run 尚无规则事件</strong><p>移动、检定、巨剑、碎片与终局结算会按发生顺序记录。</p></div>}
    </section>
  );
}

function modeLabel(mode: RunHistoryRecord['mode']) {
  return mode === 'preset' ? '预设迷宫' : mode === 'endless' ? '本地无尽' : '小说剧情';
}

function ruleEventLabel(event: RuleEvent) {
  const labels: Record<RuleEvent['type'], string> = {
    'check.resolved': 'D20 检定完成',
    'greatsword.used': '巨剑战术已执行',
    'fragment.acquired': '记忆碎片已取得',
    'fragment.overflow': '记忆槽位溢出',
    'fragment.discarded': '新碎片已放弃',
    'fragment.replaced': '记忆碎片已替换',
    'run.moved': '迷宫节点已移动',
    'node.completed': '迷宫节点已完成',
    'encounter.action-resolved': '遭遇行动已结算',
    'comfort.used': '陪伴交互已完成',
    'economy.echoes-changed': '记忆残响已变更',
    'module.acquired': '认知模块已装载',
    'fragment.sold': '记忆碎片已出售',
    'run.ended': 'Run 已结束',
  };
  return labels[event.type];
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
