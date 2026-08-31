import {
  Keyboard,
  Menu,
  TriangleAlert,
  Wifi,
} from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { NotificationCenter } from '../components/NotificationCenter';
import { ShortcutDialog } from '../components/ShortcutDialog';
import { DiaryDirector } from '../features/diary/DiaryDirector';
import { useTavern } from '../features/tavern/runtime/useTavern';
import { getOverloadBand } from '../game/overload';
import { useGameStore } from '../store/gameStore';
import './app-shell.css';
import '../components/components.css';

const navItems = [
  { path: '/game', label: '游戏' },
  { path: '/compendium', label: '记忆图鉴' },
  { path: '/diary', label: '迷迭香手记' },
  { path: '/records', label: '行动记录' },
  { path: '/settings', label: '系统设置' },
] as const;

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const preferences = useGameStore((state) => state.ui.preferences);
  const overload = useGameStore((state) => state.rosmontis.overload);
  const run = useGameStore((state) => state.run);
  const tavern = useTavern();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const overloadBand = getOverloadBand(overload);
  const connectionLabel = tavern.transportMode === 'remote' ? '远程连接' : '本地模拟';

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.density = preferences.density;
    root.dataset.motion = preferences.motion;
    root.dataset.fontSize = preferences.fontSize;
    root.dataset.contrast = preferences.highContrast ? 'high' : 'standard';
    root.dataset.textSpeed = preferences.textSpeed;
  }, [preferences]);

  useEffect(() => {
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [location.pathname]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.overloadBand = overloadBand;
    return () => { delete root.dataset.overloadBand; };
  }, [overloadBand]);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      const isTyping = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || (target instanceof HTMLElement && target.isContentEditable);

      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (isTyping) return;
      if (event.key === '?') {
        event.preventDefault();
        setShortcutsOpen(true);
      } else if (event.key === '/') {
        event.preventDefault();
        navigate('/game');
      }
    };

    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, [navigate]);

  return (
    <div className="terminal-shell" data-overload-band={overloadBand}>
      <DiaryDirector />
      <div className="overload-sensory-layer" aria-hidden="true" />
      <a id="global-skip-to-content" className="skip-link" href="#main-content">跳至主内容</a>

      <header className="app-topbar">
        <NavLink id="global-brand-home" className="app-brand" to="/game" onClick={() => setMenuOpen(false)}>
          <span aria-hidden="true">R</span>
          <strong>迷迭香的记忆迷宫</strong>
        </NavLink>

        <button
          id="global-menu-toggle"
          className="global-menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="global-top-menu"
          aria-label={menuOpen ? '收起顶部菜单' : '展开顶部菜单'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Menu size={21} aria-hidden />
        </button>

        <nav id="global-top-menu" className="app-top-menu" aria-label="顶部菜单" data-open={menuOpen}>
          {navItems.map((item) => (
            <NavLink
              id={`nav-${item.path.slice(1)}-open`}
              key={item.path}
              to={item.path}
              className={({ isActive }) => `app-top-menu-link${isActive ? ' is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="app-topbar-status" aria-label="当前探索状态">
          <span className="app-run-status">第 {run.floor} 层 · 回合 {run.turn}</span>
          <span className={`app-overload-status is-${overloadBand}`}><TriangleAlert size={15} aria-hidden />过载 {overload}%</span>
          <NavLink id="global-connection-settings" className="app-connection-status" to="/settings" aria-label={`打开接口连接设置，当前${connectionLabel}`}>
            <Wifi size={15} aria-hidden />{connectionLabel}
          </NavLink>
          <button id="global-shortcuts-open" className="topbar-icon-button" type="button" aria-label="打开快捷键说明" onClick={() => setShortcutsOpen(true)}>
            <Keyboard size={20} aria-hidden />
          </button>
        </div>
      </header>

      <div className="terminal-workspace">
        <main id="main-content" className="terminal-main" tabIndex={-1}>
          <Suspense fallback={<RouteLoading />}><Outlet /></Suspense>
        </main>
        <footer id="global-fanwork-disclaimer" className="fanwork-disclaimer">
          本项目为基于《明日方舟》世界观的非营利性同人衍生作品，角色及设定版权归上海鹰角网络科技有限公司所有。
        </footer>
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
      <p>正在载入记忆迷宫</p>
    </div>
  );
}
