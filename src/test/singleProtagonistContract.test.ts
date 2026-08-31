import { describe, expect, test } from 'vitest';
import appShellSource from '../app/AppShell.tsx?raw';
import commandConsoleSource from '../features/operation/CommandConsole.tsx?raw';
import demoDataSource from '../data/demoData.ts?raw';
import gamePageSource from '../features/game/GamePage.tsx?raw';
import mazeStageSource from '../features/game/MazeStage.tsx?raw';
import nodeSceneSource from '../features/game/NodeScene.tsx?raw';
import resetDialogSource from '../features/settings/ResetDemoDialog.tsx?raw';
import gameStoreSource from '../store/gameStore.ts?raw';
import gameTypesSource from '../types/game.ts?raw';

const runtimeFiles = [
  ['src/app/AppShell.tsx', appShellSource],
  ['src/features/operation/CommandConsole.tsx', commandConsoleSource],
  ['src/data/demoData.ts', demoDataSource],
  ['src/features/game/GamePage.tsx', gamePageSource],
  ['src/features/game/MazeStage.tsx', mazeStageSource],
  ['src/features/game/NodeScene.tsx', nodeSceneSource],
  ['src/features/settings/ResetDemoDialog.tsx', resetDialogSource],
  ['src/store/gameStore.ts', gameStoreSource],
  ['src/types/game.ts', gameTypesSource],
] as const;

describe('single protagonist runtime copy', () => {
  test.each(runtimeFiles)('%s excludes retired characters and squad terminology', (_file, source) => {
    expect(source).not.toMatch(/阿米娅|末药|蛇屠箱|干员与小队|随行小队|小队链路|小队|队员/);
  });
});
