import { render } from '@testing-library/react';
import { App } from '../app/App';
import { useGameStore } from '../store/gameStore';

export function renderApp(path = '/') {
  useGameStore.getState().resetDemoState();
  window.history.pushState({}, '', path);
  return render(<App />);
}
