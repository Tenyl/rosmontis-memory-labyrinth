import {
  RotateCcw as ArrowCounterClockwise,
  CircleCheck as CheckCircle,
  Code,
  Database,
  Eye,
  Library,
  HardDrive as HardDrives,
  MessagesSquare,
  Plug as Plugs,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useGameStore } from '../../store/gameStore';
import { PreferenceControls } from './PreferenceControls';
import { ResetDemoDialog } from './ResetDemoDialog';
import { TavernConnectionSettings } from './TavernConnectionSettings';
import { TavernDataSettings } from './TavernDataSettings';
import { TavernParsingSettings } from './TavernParsingSettings';
import { LorebookManager } from '../tavern/lorebooks/LorebookManager';
import { CharacterManager } from '../tavern/characters/CharacterManager';
import { SessionManager } from '../tavern/components/SessionManager';
import { SessionBranchTree } from '../log/SessionBranchTree';
import './settings.css';

const PresetManager = lazy(async () => ({
  default: (await import('../tavern/presets/PresetManager')).PresetManager,
}));

type SettingsWorkspace = 'connection' | 'generation' | 'parsing' | 'data' | 'visual' | 'content' | 'sessions';

const tabs = [
  { value: 'connection', label: '接口连接', panelId: 'settings-panel-connection', icon: Plugs },
  { value: 'generation', label: '生成预设', panelId: 'settings-panel-generation', icon: SlidersHorizontal },
  { value: 'parsing', label: '解析协议', panelId: 'settings-panel-parsing', icon: Code },
  { value: 'data', label: '本地数据', panelId: 'settings-panel-data', icon: Database },
  { value: 'visual', label: '视觉与辅助', panelId: 'settings-panel-visual', icon: Eye },
  { value: 'content', label: '内容资料', panelId: 'settings-panel-content', icon: Library },
  { value: 'sessions', label: '会话管理', panelId: 'settings-panel-sessions', icon: MessagesSquare },
] satisfies Array<{ value: SettingsWorkspace; label: string; panelId: string; icon: typeof Plugs }>;

export default function SettingsPage() {
  const preferences = useGameStore((state) => state.ui.preferences);
  const setUiPreference = useGameStore((state) => state.setUiPreference);
  const resetDemoState = useGameStore((state) => state.resetDemoState);
  const addNotification = useGameStore((state) => state.addNotification);
  const progression = useGameStore((state) => state.progression);
  const [workspace, setWorkspace] = useState<SettingsWorkspace>('connection');
  const [resetOpen, setResetOpen] = useState(false);

  const confirmReset = () => {
    resetDemoState();
    addNotification({ id: 'notification-demo-reset', kind: 'success', title: '演示状态已恢复', message: '战术投影、节点、干员、档案与界面偏好已恢复；酒馆角色和会话数据不受影响。', dismissible: true });
    setResetOpen(false);
  };

  return (
    <section className="route-page settings-route" aria-labelledby="settings-page-title">
      <PageHeader id="settings-page-title" code="06" title="系统设置" description="配置模型接口、剧情生成、本地存档和辅助显示。离线预设与本地无尽不依赖 API。" meta="LOCAL PROFILE / SECURE" actions={<span className="settings-saved"><CheckCircle size={16} aria-hidden />本地持久化已开启</span>} />
      <section className="settings-overview" aria-label="设置存储概况"><div><HardDrives size={20} aria-hidden /><span>存储位置</span><strong>浏览器本地</strong><small>INDEXEDDB + LOCAL STORAGE</small></div><div><ShieldCheck size={20} aria-hidden /><span>密钥边界</span><strong>不进入备份</strong><small>LOCAL SECRET</small></div><div><span>数据库版本</span><strong>V4</strong><small>ROGUELIKE SAVE SCHEMA</small></div><div><span>本地无尽</span><strong>{progression.firstClear ? '已解锁' : '待首次通关'}</strong><small>{progression.completedRuns} RUNS COMPLETE</small></div></section>
      <div className="settings-tabs-shell">
        <SegmentedControl id="settings-tabs" label="系统设置工作区" value={workspace} items={tabs.map(({ value, label, panelId, icon: Icon }) => ({ value, label, panelId, icon: <Icon size={16} aria-hidden /> }))} onChange={setWorkspace} mode="tabs" />
      </div>
      {workspace === 'connection' ? <TavernConnectionSettings /> : null}
      {workspace === 'generation' ? <section id="settings-panel-generation" className="settings-workspace" role="tabpanel" aria-labelledby="settings-tabs-generation"><Suspense fallback={<div className="settings-panel-loading" role="status">正在读取生成预设编辑器。</div>}><PresetManager embedded /></Suspense></section> : null}
      {workspace === 'parsing' ? <TavernParsingSettings /> : null}
      {workspace === 'data' ? <TavernDataSettings /> : null}
      {workspace === 'visual' ? <section id="settings-panel-visual" className="settings-workspace" role="tabpanel" aria-labelledby="settings-tabs-visual"><header className="settings-workspace-heading"><div><span className="panel-code">TERMINAL DISPLAY / ACCESSIBILITY</span><h2>视觉与辅助</h2><p>调整信息密度、叙事速度、动效、字号和辅助对比度。</p></div></header><PreferenceControls preferences={preferences} onChange={setUiPreference} /><section className="settings-danger-zone"><div><span className="panel-code">TACTICAL PROJECTION / RESET</span><h2>恢复战术演示状态</h2><p>重置节点、干员、档案、战术投影与界面偏好，不删除 IndexedDB 中的酒馆角色、世界书和会话。</p></div><button id="settings-reset-open" type="button" onClick={() => setResetOpen(true)}><ArrowCounterClockwise size={18} aria-hidden />恢复演示初始状态</button></section></section> : null}
      {workspace === 'content' ? (
        <section id="settings-panel-content" className="settings-workspace settings-manager-stack" role="tabpanel" aria-labelledby="settings-tabs-content">
          <LorebookManager />
          <CharacterManager />
        </section>
      ) : null}
      {workspace === 'sessions' ? (
        <section id="settings-panel-sessions" className="settings-workspace settings-manager-stack" role="tabpanel" aria-labelledby="settings-tabs-sessions">
          <SessionManager />
          <section className="settings-session-tree" aria-labelledby="settings-session-tree-title">
            <header className="settings-workspace-heading">
              <div><span className="panel-code">SESSION GRAPH / LOCAL</span><h2 id="settings-session-tree-title">会话分支</h2><p>查看、载入、导出或清理当前浏览器中的会话分支。</p></div>
            </header>
            <div className="settings-session-tree-viewport"><SessionBranchTree /></div>
          </section>
        </section>
      ) : null}
      <aside id="settings-fanwork-disclaimer" className="settings-fanwork-disclaimer" aria-label="非营利二创免责声明">
        <span className="panel-code">FAN WORK / NON-COMMERCIAL</span>
        <p>本项目为基于《明日方舟》世界观的非营利性同人衍生作品，角色及设定版权归上海鹰角网络科技有限公司所有。</p>
      </aside>
      <ResetDemoDialog open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={confirmReset} />
    </section>
  );
}
