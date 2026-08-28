import { PageHeader } from '../../components/PageHeader';

export default function LogPage() {
  return (
    <section className="route-page" aria-labelledby="log-page-title">
      <PageHeader code="05" title="行动记录" description="追溯章节、指令、检定、状态变化与情报入库。" meta="05 RECORDS" />
      <div className="terminal-panel route-preview-wide">
        <span className="panel-code">TIMELINE / CHAPTER 01</span>
        <h2>进入失温病历</h2>
        <p>03:20:00，小队进入废弃医疗站并建立第一处意识锚点。</p>
      </div>
    </section>
  );
}
