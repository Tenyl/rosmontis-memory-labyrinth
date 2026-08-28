import { PageHeader } from '../../components/PageHeader';

export default function MemoryPage() {
  return (
    <section className="route-page" aria-labelledby="memory-page-title">
      <PageHeader code="02" title="意识战场" description="定位表层记忆节点，并向深层潜意识或未知战局拓建。" meta="LAYER 00" />
      <div className="terminal-panel route-preview-wide">
        <span className="panel-code">MEMORY CORRIDOR / SURFACE</span>
        <h2>三个战术节点已建立</h2>
        <p>雨幕中的疗养院、无声候车厅、编号 R-09 隔离室正在等待进一步侦察。</p>
      </div>
    </section>
  );
}
