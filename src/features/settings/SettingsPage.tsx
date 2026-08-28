import { ArrowCounterClockwise, CheckCircle, HardDrives, ShieldCheck } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useGameStore } from '../../store/gameStore';
import { PreferenceControls } from './PreferenceControls';
import { ResetDemoDialog } from './ResetDemoDialog';
import './settings.css';

export default function SettingsPage() {
  const preferences = useGameStore((state) => state.ui.preferences);
  const setUiPreference = useGameStore((state) => state.setUiPreference);
  const resetDemoState = useGameStore((state) => state.resetDemoState);
  const addNotification = useGameStore((state) => state.addNotification);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.density = preferences.density;
    root.dataset.motion = preferences.motion;
    root.dataset.fontSize = preferences.fontSize;
    root.dataset.contrast = preferences.highContrast ? 'high' : 'standard';
    root.dataset.textSpeed = preferences.textSpeed;
  }, [preferences]);

  const confirmReset = () => {
    resetDemoState();
    addNotification({ id: 'notification-demo-reset', kind: 'success', title: '演示状态已恢复', message: '剧情、节点、干员、档案与界面偏好均已恢复到初始演示状态。', dismissible: true });
    setResetOpen(false);
  };

  return (
    <section className="route-page settings-route" aria-labelledby="settings-page-title">
      <PageHeader code="06" title="系统设置" description="调整信息密度、叙事速度、动效、字号和辅助显示。所有偏好只保存在当前浏览器。" meta="LOCAL PROFILE / SECURE" actions={<span className="settings-saved"><CheckCircle size={16} weight="fill" aria-hidden />偏好已保存</span>} />
      <section className="settings-overview" aria-label="设置存储概况"><div><HardDrives size={20} aria-hidden /><span>存储位置</span><strong>浏览器本地</strong><small>LOCAL STORAGE</small></div><div><ShieldCheck size={20} aria-hidden /><span>数据外传</span><strong>未启用</strong><small>NO REMOTE SYNC</small></div><div><span>档案版本</span><strong>0.4.17</strong><small>PROTOTYPE BUILD</small></div></section>
      <PreferenceControls preferences={preferences} onChange={setUiPreference} />
      <section className="settings-danger-zone"><div><span className="panel-code">DEMO STATE / RESET</span><h2>恢复原型初始状态</h2><p>清除本轮产生的剧情、节点、状态变化、档案操作与界面偏好，重新载入“雨幕回声”演示。</p></div><button id="settings-reset-open" type="button" onClick={() => setResetOpen(true)}><ArrowCounterClockwise size={18} aria-hidden />恢复演示初始状态</button></section>
      <ResetDemoDialog open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={confirmReset} />
    </section>
  );
}
