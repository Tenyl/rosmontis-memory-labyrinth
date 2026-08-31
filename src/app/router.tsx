import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './AppShell';

const OperationPage = lazy(() => import('../features/operation/OperationPage'));
const MemoryPage = lazy(() => import('../features/memory/MemoryPage'));
const OperatorsPage = lazy(() => import('../features/operators/OperatorsPage'));
const ArchivePage = lazy(() => import('../features/archive/ArchivePage'));
const LogPage = lazy(() => import('../features/log/LogPage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));
const CompendiumPage = lazy(() => import('../features/compendium/CompendiumPage'));
const DiaryPage = lazy(() => import('../features/diary/DiaryPage'));
const RecordsPage = lazy(() => import('../features/records/RecordsPage'));
const GamePage = lazy(() => import('../features/game/GamePage'));

export function createAppRouter() {
  return createBrowserRouter([
    {
      path: '/',
      element: <AppShell />,
      children: [
        { index: true, element: <Navigate to="/operation" replace /> },
        { path: 'operation', element: <OperationPage /> },
        { path: 'memory', element: <MemoryPage /> },
        { path: 'operators', element: <OperatorsPage /> },
        { path: 'archive', element: <ArchivePage /> },
        { path: 'log', element: <LogPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: 'compendium', element: <CompendiumPage /> },
        { path: 'diary', element: <DiaryPage /> },
        { path: 'records', element: <RecordsPage /> },
        { path: 'game', element: <GamePage /> },
        { path: '*', element: <Navigate to="/operation" replace /> },
      ],
    },
  ]);
}
