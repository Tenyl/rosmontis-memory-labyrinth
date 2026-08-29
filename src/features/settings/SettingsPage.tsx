import {
  ArrowCounterClockwise,
  CheckCircle,
  Code,
  Database,
  Eye,
  HardDrives,
  Plugs,
  ShieldCheck,
  SlidersHorizontal,
} from '@phosphor-icons/react';
import { lazy, Suspense, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useGameStore } from '../../store/gameStore';
import { PreferenceControls } from './PreferenceControls';
import { ResetDemoDialog } from './ResetDemoDialog';
import { TavernConnectionSettings } from './TavernConnectionSettings';
import { TavernDataSettings } from './TavernDataSettings';
import { TavernParsingSettings } from './TavernParsingSettings';
import './settings.css';

const PresetManager = lazy(async () => ({
  default: (await import('../tavern/presets/PresetManager')).PresetManager,
}));

type SettingsWorkspace = 'connection' | 'generation' | 'parsing' | 'data' | 'visual';

const tabs = [
  { value: 'connection', label: '接口连接', panelId: 'settings-panel-connection', icon: Plugs },
  { value: 'generation', label: '生成预设', panelId: 'settings-panel-generation', icon: SlidersHorizontal },
  { value: 'parsing', label: '解析协议', panelId: 'settings-panel-parsing', icon: Code },
  { value: 'data', label: '本地数据', panelId: 'settings-panel-data', icon: Database },
  { value: 'visual', label: '视觉与辅助', panelId: 'settings-panel-visual', icon: Eye },
] satisfies Array<{ value: SettingsWorkspace; label: string; panelId: string; icon: typeof Plugs }>;

export default function SettingsPage() {
  const preferences = useGameStore((state) => state.ui.preferences);
  const setUiPreference = useGameStore((state) => state.setUiPreference);
  const resetDemoState = useGameStore((state) => state.resetDemoState);
  const addNotification = useGameStore((state) => state.addNotification);
  const [workspace, setWorkspace] = useState<SettingsWorkspace>('connection');
  const [resetOpen, setResetOpen] = useState(false);

  const confirmReset = () => {
    resetDemoState();
    addNotification({ id: 'notification-demo-reset', kind: 'success', title: '演示状态已恢复', message: '战术投影、节点、干员、档案与界面偏好已恢复；酒馆角色和会话数据不受影响。', dismissible: true });
    setResetOpen(false);
  };

  return (
    <section className="route-page settings-route" aria-labelledby="settings-page-title">
      <PageHeader id="settings-page-title" code="06" title="系统设置" description="配置模型接口、生成预设、六标签解析、本地数据和辅助显示。所有数据均保留在当前浏览器。" meta="LOCAL PROFILE / SECURE" actions={<span className="settings-saved"><CheckCircle size={16} weight="fill" aria-hidden />本地持久化已开启</span>} />
      <section className="settings-overview" aria-label="设置存储概况"><div><HardDrives size={20} aria-hidden /><span>存储位置</span><strong>浏览器本地</strong><small>INDEXEDDB + LOCAL STORAGE</small></div><div><ShieldCheck size={20} aria-hidden /><span>密钥边界</span><strong>不进入备份</strong><small>LOCAL SECRET</small></div><div><span>数据库版本</span><strong>V4</strong><small>FRONTEND PROTOTYPE</small></div></section>
      <div className="settings-tabs-shell">
        <SegmentedControl id="settings-tabs" label="系统设置工作区" value={workspace} items={tabs.map(({ value, label, panelId, icon: Icon }) => ({ value, label, panelId, icon: <Icon size={16} aria-hidden /> }))} onChange={setWorkspace} mode="tabs" />
      </div>
      {workspace === 'connection' ? <TavernConnectionSettings /> : null}
      {workspace === 'generation' ? <section id="settings-panel-generation" className="settings-workspace" role="tabpanel" aria-labelledby="settings-tabs-generation"><Suspense fallback={<div className="settings-panel-loading" role="status">正在读取生成预设编辑器。</div>}><PresetManager embedded /></Suspense></section> : null}
      {workspace === 'parsing' ? <TavernParsingSettings /> : null}
      {workspace === 'data' ? <TavernDataSettings /> : null}
      {workspace === 'visual' ? <section id="settings-panel-visual" className="settings-workspace" role="tabpanel" aria-labelledby="settings-tabs-visual"><header className="settings-workspace-heading"><div><span className="panel-code">TERMINAL DISPLAY / ACCESSIBILITY</span><h2>视觉与辅助</h2><p>调整信息密度、叙事速度、动效、字号和辅助对比度。</p></div></header><PreferenceControls preferences={preferences} onChange={setUiPreference} /><section className="settings-danger-zone"><div><span className="panel-code">TACTICAL PROJECTION / RESET</span><h2>恢复战术演示状态</h2><p>重置节点、干员、档案、战术投影与界面偏好，不删除 IndexedDB 中的酒馆角色、世界书和会话。</p></div><button id="settings-reset-open" type="button" onClick={() => setResetOpen(true)}><ArrowCounterClockwise size={18} aria-hidden />恢复演示初始状态</button></section></section> : null}
      <ResetDemoDialog open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={confirmReset} />
    </section>
  );
}
