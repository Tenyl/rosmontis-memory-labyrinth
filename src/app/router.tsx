import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { hasActiveRunSave } from '../game/saveSlots';
import { AppShell } from './AppShell';

const GamePage = lazy(() => import('../features/game/GamePage'));
const RosmontisChatPage = lazy(() => import('../features/chat/RosmontisChatPage'));
const TitlePage = lazy(() => import('../features/title/TitlePage'));
const CompendiumPage = lazy(() => import('../features/compendium/CompendiumPage'));
const DiaryPage = lazy(() => import('../features/diary/DiaryPage'));
const RecordsPage = lazy(() => import('../features/records/RecordsPage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));

export function createAppRouter() {
  return createBrowserRouter([
    {
      path: '/',
      element: <AppShell />,
      children: [
        { index: true, element: <TitlePage /> },
        { path: 'game', element: <GameRoute /> },
        { path: 'chat', element: <RosmontisChatPage /> },
        { path: 'compendium', element: <CompendiumPage /> },
        { path: 'diary', element: <DiaryPage /> },
        { path: 'records', element: <RecordsPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'operation', element: <Navigate to="/game" replace /> },
        { path: 'memory', element: <Navigate to="/game" replace /> },
        { path: 'operators', element: <Navigate to="/game" replace /> },
        { path: 'archive', element: <Navigate to="/compendium" replace /> },
        { path: 'log', element: <Navigate to="/records" replace /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ]);
}

function GameRoute() {
  return hasActiveRunSave(localStorage)
    ? <GamePage />
    : <Navigate to="/" replace />;
}
