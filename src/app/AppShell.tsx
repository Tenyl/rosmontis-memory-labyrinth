import {
  Archive,
  ClockCounterClockwise,
  Command,
  Graph,
  Keyboard,
  SlidersHorizontal,
  UsersThree,
  WarningDiamond,
  WifiHigh,
} from '@phosphor-icons/react';
import { Suspense, type ComponentType, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { selectSession, selectUnreadArchiveCount } from '../store/selectors';
import { NotificationCenter } from '../components/NotificationCenter';
import { ShortcutDialog } from '../components/ShortcutDialog';
import './app-shell.css';
import '../components/components.css';

interface NavItem {
  path: string;
  label: string;
  caption: string;
  icon: ComponentType<{ size?: number; weight?: 'regular' | 'bold'; 'aria-hidden'?: boolean }>;
}

const navItems: NavItem[] = [
  { path: '/operation', label: '作战主控台', caption: 'OPERATION', icon: Command },
  { path: '/memory', label: '意识战场', caption: 'MEMORY', icon: Graph },
  { path: '/operators', label: '干员与小队', caption: 'OPERATORS', icon: UsersThree },
  { path: '/archive', label: '情报档案库', caption: 'ARCHIVE', icon: Archive },
  { path: '/log', label: '行动记录', caption: 'ACTION LOG', icon: ClockCounterClockwise },
  { path: '/settings', label: '系统设置', caption: 'SYSTEM', icon: SlidersHorizontal },
];

export function AppShell() {
  const navigate = useNavigate();
  const session = useGameStore(selectSession);
  const unreadArchiveCount = useGameStore(selectUnreadArchiveCount);
  const preferences = useGameStore((state) => state.ui.preferences);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.density = preferences.density;
    root.dataset.motion = preferences.motion;
    root.dataset.fontSize = preferences.fontSize;
    root.dataset.contrast = preferences.highContrast ? 'high' : 'standard';
    root.dataset.textSpeed = preferences.textSpeed;
  }, [preferences]);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
      if (isTyping) return;
      if (event.key === '?') {
        event.preventDefault();
        setShortcutsOpen(true);
      } else if (event.key === '/') {
        event.preventDefault();
        navigate('/operation');
        window.setTimeout(() => document.getElementById('operation-command-input')?.focus(), 0);
      }
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, [navigate]);

  return (
    <div className="terminal-shell">
      <a id="global-skip-to-content" className="skip-link" href="#main-content">跳至主内容</a>
      <aside className="terminal-sidebar" aria-label="终端主导航">
        <div className="terminal-brand">
          <div className="brand-mark" aria-hidden="true"><span>R</span><i /></div>
          <div className="terminal-brand-copy">
            <span>RHODES</span>
            <strong>罗德岛意识战术终端</strong>
            <small>COGNITION OPS / 04</small>
          </div>
        </div>
        <nav className="primary-navigation" aria-label="主要功能">
          <p className="navigation-label">战术模块 / 06</p>
          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <NavLink
                id={`nav-${item.path.slice(1)}-open`}
                key={item.path}
                to={item.path}
                className={({ isActive }) => `terminal-nav-link${isActive ? ' is-active' : ''}`}
              >
                {({ isActive }) => (
                  <>
                    <span className="nav-index">{String(index + 1).padStart(2, '0')}</span>
                    <Icon size={21} weight={isActive ? 'bold' : 'regular'} aria-hidden />
                    <span className="nav-copy"><strong>{item.label}</strong><small>{item.caption}</small></span>
                    {item.path === '/archive' && unreadArchiveCount > 0 ? (
                      <span className="nav-count" aria-label={`${unreadArchiveCount} 条未读情报`}>{unreadArchiveCount}</span>
                    ) : null}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-telemetry">
          <span className="telemetry-label">终端完整性</span>
          <div className="telemetry-value"><strong>98.7</strong><span>%</span></div>
          <div className="telemetry-line"><i /></div>
          <small>LOCAL SIMULATION / SECURE</small>
        </div>
      </aside>
      <div className="terminal-workspace">
        <header className="terminal-topbar">
          <div className="operation-identity">
            <span className="topbar-kicker">当前行动</span>
            <strong>{session.operationCode}</strong>
            <span className="operation-divider" aria-hidden="true" />
            <span>{session.chapter}</span>
          </div>
          <div className="topbar-statuses">
            <span className="connection-status"><WifiHigh size={17} aria-hidden />{session.connection}</span>
            <span className="risk-status"><WarningDiamond size={17} aria-hidden />全局风险 {session.globalRisk}</span>
            <button id="global-shortcuts-open" className="topbar-icon-button" type="button" aria-label="打开快捷键说明" onClick={() => setShortcutsOpen(true)}>
              <Keyboard size={20} aria-hidden />
            </button>
            <time className="terminal-clock" dateTime="03:27:16">03:27:16</time>
          </div>
        </header>
        <main id="main-content" className="terminal-main" tabIndex={-1}>
          <Suspense fallback={<RouteLoading />}><Outlet /></Suspense>
        </main>
      </div>
      <NotificationCenter />
      <ShortcutDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

function RouteLoading() {
  return (
    <div className="route-loading" role="status">
      <span className="route-loading-bar" />
      <p>正在载入战术模块</p>
    </div>
  );
}
