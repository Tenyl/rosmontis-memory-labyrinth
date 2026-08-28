import { PageHeader } from '../../components/PageHeader';

export default function OperationPage() {
  return (
    <section className="route-page operation-route" aria-labelledby="operation-page-title">
      <PageHeader code="01" title="作战主控台" description="解析剧情、执行战术指令并监控小队状态。" meta="LIVE SESSION" />
      <div className="route-preview-grid">
        <article className="terminal-panel route-preview-primary">
          <span className="panel-code">NARRATIVE / ACTIVE</span>
          <h2>雨幕下的入口</h2>
          <p>雨水沿着破损玻璃向上爬升。迷迭香在西侧墙体后捕捉到不属于当前时间层的心智回声。</p>
        </article>
        <aside className="terminal-panel">
          <span className="panel-code">TACTICAL OVERVIEW</span>
          <h2>目标确认</h2>
          <p>确认 R-09 隔离区异常意识来源。</p>
        </aside>
      </div>
    </section>
  );
}
