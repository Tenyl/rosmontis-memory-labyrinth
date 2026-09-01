import { render } from '@testing-library/react';
import { App } from '../app/App';
import { createSaveSlot, setActiveSaveSlotId } from '../game/saveSlots';
import { useGameStore } from '../store/gameStore';

export function renderApp(path = '/') {
  useGameStore.getState().resetDemoState();
  window.history.pushState({}, '', path);
  return render(<App />);
}

export function renderPlayableApp(path = '/game', prepareRun?: () => void) {
  useGameStore.getState().resetDemoState();
  prepareRun?.();
  setActiveSaveSlotId('slot-1', localStorage);
  createSaveSlot('slot-1', useGameStore.getState(), localStorage);
  window.history.pushState({}, '', path);
  return render(<App />);
}
