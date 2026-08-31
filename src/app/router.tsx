import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './AppShell';

const GamePage = lazy(() => import('../features/game/GamePage'));
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
        { index: true, element: <Navigate to="/game" replace /> },
        { path: 'game', element: <GamePage /> },
        { path: 'compendium', element: <CompendiumPage /> },
        { path: 'diary', element: <DiaryPage /> },
        { path: 'records', element: <RecordsPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'operation', element: <Navigate to="/game" replace /> },
        { path: 'memory', element: <Navigate to="/game" replace /> },
        { path: 'operators', element: <Navigate to="/game" replace /> },
        { path: 'archive', element: <Navigate to="/compendium" replace /> },
        { path: 'log', element: <Navigate to="/records" replace /> },
        { path: '*', element: <Navigate to="/game" replace /> },
      ],
    },
  ]);
}
