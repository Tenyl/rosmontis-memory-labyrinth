import { PageHeader } from '../../components/PageHeader';

export default function OperatorsPage() {
  return (
    <section className="route-page" aria-labelledby="operators-page-title">
      <PageHeader code="03" title="干员与小队" description="读取迷迭香医疗监测、跑团属性与随行小队状态。" meta="4 ONLINE" />
      <div className="terminal-panel route-preview-wide">
        <span className="panel-code">ELITE / RSM-04</span>
        <h2>迷迭香</h2>
        <p>理智稳定度 72%，精神负荷 41 / 100，当前状态为轻度意识重叠。</p>
      </div>
    </section>
  );
}
