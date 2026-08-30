import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ApiSettings } from '../../sillytavern';
import { clearAllData } from '../../sillytavern/database';
import { useGameStore } from '../../store/gameStore';
import { TavernProvider } from '../tavern/runtime/TavernProvider';
import type { TavernTransport } from '../tavern/runtime/tavern-transport';
import { RosmontisQuotePanel } from './RosmontisQuotePanel';

const api: ApiSettings = {
  baseUrl: 'https://llm.example/v1',
  apiKey: 'sk-test-only',
  model: 'quote-model',
  timeout: 1000,
};

beforeEach(async () => {
  await clearAllData();
  useGameStore.getState().resetDemoState();
  act(() => {
    useGameStore.setState((state) => ({
      ruleLog: [{
        type: 'greatsword.used',
        swordId: 'breach',
        actionPointCost: 1,
        overloadDelta: 10,
        cooldown: 2,
      }],
      run: { ...state.run, phase: 'exploring' },
    }));
  });
});

function renderPanel(transport: TavernTransport, apiOverride: ApiSettings | null = api) {
  return render(
    <MemoryRouter>
      <TavernProvider>
        <RosmontisQuotePanel apiOverride={apiOverride} transportOverride={transport} />
      </TavernProvider>
    </MemoryRouter>,
  );
}

describe('temporary Rosmontis quote panel', () => {
  test('uses a deterministic local line without requesting when API is unavailable', async () => {
    const stream = vi.fn(async function* () { yield '{}'; });
    renderPanel({ mode: 'remote', stream }, null);

    const panel = await screen.findByRole('status', { name: '迷迭香临时台词' });
    expect(panel).toHaveTextContent('本地预设');
    expect(panel.textContent).toContain('我');
    expect(stream).not.toHaveBeenCalled();
    expect(panel.querySelector('img')).toHaveAttribute('src', '/assets/characters/blank-character.svg');
  });

  test('requests once with action context and displays a validated remote quote', async () => {
    const stream = vi.fn(async function* () { yield '{"text":"我会把这道回声切开。"}'; });
    const view = renderPanel({ mode: 'remote', stream });

    const panel = await screen.findByRole('status', { name: '迷迭香临时台词' });
    expect(panel).toHaveTextContent('我会把这道回声切开。');
    expect(panel).toHaveTextContent('远程生成');
    expect(stream).toHaveBeenCalledTimes(1);
    expect(stream).toHaveBeenCalledWith(
      expect.objectContaining({
        gameTask: 'quote',
        messages: expect.arrayContaining([
          expect.objectContaining({ content: expect.stringContaining('破壁巨剑') }),
        ]),
      }),
      expect.any(AbortSignal),
    );

    view.rerender(
      <MemoryRouter>
        <TavernProvider>
          <RosmontisQuotePanel apiOverride={api} transportOverride={{ mode: 'remote', stream }} />
        </TavernProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(1));
  });

  test('falls back when a remote quote violates the 30-character first-person contract', async () => {
    const stream = vi.fn(async function* () { yield '{"text":"这不是第一人称台词。"}'; });
    renderPanel({ mode: 'remote', stream });

    const panel = await screen.findByRole('status', { name: '迷迭香临时台词' });
    expect(panel).toHaveTextContent('本地回退');
    expect(panel.textContent).toContain('我');
  });

  test('rejects a response from an earlier Run', async () => {
    let release!: () => void;
    let oldRequestFinished = false;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const stream = vi.fn(async function* () {
      await gate;
      yield '{"text":"我仍在旧的迷宫里。"}';
      oldRequestFinished = true;
    });
    renderPanel({ mode: 'remote', stream });
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(1));

    act(() => useGameStore.getState().resetRun());
    release();
    await waitFor(() => expect(oldRequestFinished).toBe(true));
    await waitFor(() => expect(useGameStore.getState().llmDirector.quote).toBeNull());
  });
});
