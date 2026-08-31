import {
  Brain,
  CircleCheck as CheckCircle,
  Info,
  Pin as PushPin,
  TriangleAlert as WarningDiamond,
} from 'lucide-react';
import type { ArchiveRecord } from '../../types/game';

interface ReasoningBoardProps { records: ArchiveRecord[]; }

export function ReasoningBoard({ records }: ReasoningBoardProps) {
  const pinned = records.filter((record) => record.pinned);
  const conflicts = pinned.filter((record) => record.verification === '存在冲突' || record.contamination === 'A');
  const support = pinned.filter((record) => !conflicts.includes(record));
  const confidence = pinned.length ? Math.round(pinned.reduce((sum, record) => sum + record.confidence, 0) / pinned.length) : 0;

  return (
    <section className="reasoning-board" aria-labelledby="reasoning-board-title">
      <header className="archive-view-header"><div><span className="panel-code">HYPOTHESIS WORKSPACE / LOCAL</span><h2 id="reasoning-board-title">证据推理台</h2><p>基于钉选档案组织假设；可信度只反映证据强度，不代表剧情真相。</p></div><div className="hypothesis-confidence"><span>综合可信度</span><strong>{confidence}%</strong><small>{pinned.length} 份证据</small></div></header>
      <div className="hypothesis-statement"><Brain size={24} aria-hidden /><div><span>当前假设 / H-01</span><h3>R-09 的患者意识被固定在凌晨 03:17，并由异常雨幕维持循环。</h3><p>护理员伊莲可能是循环中的引导人格，但她的身份与时间戳仍存在未解释冲突。</p></div></div>
      <div className="evidence-columns">
        <EvidenceColumn title="支持证据" tone="support" icon={<CheckCircle size={18} aria-hidden />} records={support} empty="钉选已验证或部分验证的档案以增强假设。" />
        <EvidenceColumn title="冲突证据" tone="conflict" icon={<WarningDiamond size={18} aria-hidden />} records={conflicts} empty="当前钉选证据未检测到直接冲突。" />
      </div>
      <div className="reasoning-disclaimer"><Info size={18} aria-hidden /><p><strong>推理边界</strong>系统只标记矛盾、来源和可信度，不给出最终结论。最终解释权始终由玩家与跑团叙事共同决定。</p></div>
    </section>
  );
}

function EvidenceColumn({ title, tone, icon, records, empty }: { title: string; tone: string; icon: React.ReactNode; records: ArchiveRecord[]; empty: string }) {
  return <section className={`evidence-column is-${tone}`}><header>{icon}<h3>{title}</h3><span>{records.length}</span></header>{records.length ? <div>{records.map((record) => <article key={record.id}><span>{record.code}</span><strong>{record.title}</strong><p>{record.summary}</p><footer><PushPin size={13} aria-hidden />可信度 {record.confidence}% · {record.verification}</footer></article>)}</div> : <p className="evidence-empty">{empty}</p>}</section>;
}
