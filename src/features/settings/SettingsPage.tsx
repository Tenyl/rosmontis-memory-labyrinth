import { PageHeader } from '../../components/PageHeader';

export default function SettingsPage() {
  return (
    <section className="route-page" aria-labelledby="settings-page-title">
      <PageHeader code="06" title="系统设置" description="调整信息密度、文本速度、动效与辅助功能。" meta="LOCAL PROFILE" />
      <div className="terminal-panel route-preview-wide">
        <span className="panel-code">INTERFACE / STANDARD</span>
        <h2>终端偏好</h2>
        <p>当前使用标准密度、系统动效和自动保存演示进度。</p>
      </div>
    </section>
  );
}
