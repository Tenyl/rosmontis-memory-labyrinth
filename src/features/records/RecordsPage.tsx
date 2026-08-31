import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import type { RuleEvent } from '../../game/types';
import { useGameStore } from '../../store/gameStore';
import type { RunHistoryRecord } from '../../types/game';
import { formatRuleEvent } from './formatRuleEvent';
import './records.css';

export default function RecordsPage() {
  const runHistory = useGameStore((state) => state.runHistory);
  const ruleLog = useGameStore((state) => state.ruleLog);

  return (
    <section className="route-page records-route" aria-labelledby="records-page-title">
      <PageHeader
        id="records-page-title"
        code="04"
        title="探索记录"
        description="查看每次探索的终局摘要，以及当前局由本地规则引擎产生的可读记录。"
        meta={`${runHistory.length} RUNS / ${ruleLog.length} RULE EVENTS`}
        actions={<span className="records-integrity"><ShieldCheck size={16} aria-hidden />本地记录完整</span>}
      />
      <div className="records-layout">
        <RunHistory records={runHistory} />
        <CurrentRunRecords events={ruleLog} />
      </div>
    </section>
  );
}

function RunHistory({ records }: { records: RunHistoryRecord[] }) {
  return (
    <section className="records-panel" role="region" aria-labelledby="run-history-title">
      <header>
        <div><span className="panel-code">RUN HISTORY / TERMINAL STATES</span><h2 id="run-history-title">Run 历史</h2></div>
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
      ) : <EmptyRecords title="尚无终局记录" detail="成功逃离或认知链路中断后，本次 Run 会写入这里。" />}
    </section>
  );
}

function CurrentRunRecords({ events }: { events: RuleEvent[] }) {
  const readableEvents = events.map(formatRuleEvent);
  return (
    <section className="records-panel" role="region" aria-labelledby="current-run-records-title">
      <header>
        <div><span className="panel-code">CURRENT RUN / LOCAL RULE TRACE</span><h2 id="current-run-records-title">当前局记录</h2></div>
        <span>{events.length} 条事件</span>
      </header>
      {readableEvents.length ? (
        <ol className="rule-record-list">
          {readableEvents.map((event, index) => (
            <li id={event.id} key={event.id}>
              <span>{String(index + 1).padStart(3, '0')}</span>
              <strong>{event.title}</strong>
              <p>{event.detail}</p>
            </li>
          ))}
        </ol>
      ) : <EmptyRecords title="当前 Run 尚无规则事件" detail="移动、检定、巨剑、碎片与终局结算会按发生顺序记录。" />}
    </section>
  );
}

function EmptyRecords({ title, detail }: { title: string; detail: string }) {
  return <div className="records-empty"><strong>{title}</strong><p>{detail}</p></div>;
}

function modeLabel(mode: RunHistoryRecord['mode']): string {
  return mode === 'preset' ? '预设迷宫' : mode === 'endless' ? '本地无尽' : '小说剧情';
}
