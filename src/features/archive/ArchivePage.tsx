import { PageHeader } from '../../components/PageHeader';

export default function ArchivePage() {
  return (
    <section className="route-page" aria-labelledby="archive-page-title">
      <PageHeader code="04" title="情报档案库" description="整理线索、NPC、事件与证物之间的冲突关系。" meta="2 UNREAD" />
      <div className="terminal-panel route-preview-wide">
        <span className="panel-code">ARCHIVE / CONFLICT DETECTED</span>
        <h2>潮湿的儿童病历</h2>
        <p>病历年份与 R-09 入院记录存在冲突，建议与凌晨 03:17 的广播录音交叉验证。</p>
      </div>
    </section>
  );
}
