import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { clearAllData } from '../../sillytavern/database';
import type { ApiSettings } from '../../sillytavern';
import { useGameStore } from '../../store/gameStore';
import { TavernProvider } from '../tavern/runtime/TavernProvider';
import type { TavernTransport } from '../tavern/runtime/tavern-transport';
import { LlmEventDirector, shouldTriggerLlmEvent } from './LlmEventDirector';

const api: ApiSettings = {
  baseUrl: 'https://llm.example/v1',
  apiKey: 'sk-test-only',
  model: 'event-model',
  timeout: 1000,
};

beforeEach(async () => {
  await clearAllData();
  useGameStore.getState().resetDemoState();
});

function prepareBlankNovelNode() {
  act(() => {
    useGameStore.setState((state) => ({
      run: { ...state.run, mode: 'novel', phase: 'exploring' },
      maze: {
        ...state.maze,
        nodes: state.maze.nodes.map((node) => node.id === state.run.currentNodeId
          ? { ...node, type: 'blank-event' }
          : node),
      },
    }));
  });
}

function renderDirector(transport: TavernTransport, apiOverride: ApiSettings | null = api) {
  return render(
    <MemoryRouter>
      <TavernProvider>
        <LlmEventDirector apiOverride={apiOverride} transportOverride={transport} />
      </TavernProvider>
    </MemoryRouter>,
  );
}

describe('LLM independent event director', () => {
  test('uses a deterministic trigger and always enables eligible novel blank-event nodes', () => {
    const state = useGameStore.getState();
    const node = { ...state.maze.nodes[0], type: 'blank-event' as const };
    expect(shouldTriggerLlmEvent({ ...state.run, mode: 'novel' }, node)).toBe(true);
    expect(shouldTriggerLlmEvent({ ...state.run, mode: 'preset' }, node)).toBe(
      shouldTriggerLlmEvent({ ...state.run, mode: 'preset' }, node),
    );
    expect(shouldTriggerLlmEvent(state.run, { ...node, type: 'thought-rest' })).toBe(false);
  });

  test('does not request or render AI events without API configuration', async () => {
    prepareBlankNovelNode();
    const stream = vi.fn(async function* () { yield '{}'; });
    renderDirector({ mode: 'remote', stream }, null);

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(stream).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'AI 独立事件' })).not.toBeInTheDocument();
  });

  test('requests once, displays a validated remote event, and settles its intent locally', async () => {
    prepareBlankNovelNode();
    const stream = vi.fn(async function* () {
      yield '{"title":"逆流雨幕","situation":"雨滴正在带走倒影。","choices":[';
      yield '{"id":"scan-rain","label":"读取雨声","description":"确认记忆残留。","intent":"scan"},';
      yield '{"id":"hold-line","label":"守住边界","description":"拒绝异常靠近。","intent":"guard"}]}';
    });
    const user = userEvent.setup();
    const view = renderDirector({ mode: 'remote', stream });

    const panel = await screen.findByRole('region', { name: 'AI 独立事件' });
    expect(panel).toHaveTextContent('逆流雨幕');
    expect(panel).toHaveTextContent('远程生成');
    expect(stream).toHaveBeenCalledTimes(1);
    expect(stream).toHaveBeenCalledWith(
      expect.objectContaining({ gameTask: 'event' }),
      expect.any(AbortSignal),
    );

    view.rerender(
      <MemoryRouter>
        <TavernProvider>
          <LlmEventDirector apiOverride={api} transportOverride={{ mode: 'remote', stream }} />
        </TavernProvider>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: '选择事件行动：读取雨声' }));

    expect(useGameStore.getState().rosmontis).toMatchObject({ sanity: 99, overload: 7 });
    expect(useGameStore.getState().llmDirector.event?.resolvedChoiceId).toBe('scan-rain');
    expect(stream).toHaveBeenCalledTimes(1);
  });

  test('falls back to a deterministic preset event when remote JSON is malformed', async () => {
    prepareBlankNovelNode();
    const stream = vi.fn(async function* () { yield 'not-json'; });
    renderDirector({ mode: 'remote', stream });

    const panel = await screen.findByRole('region', { name: 'AI 独立事件' });
    expect(panel).toHaveTextContent('本地回退');
    expect(panel.querySelectorAll('button[id^="llm-event-choice-"]')).toHaveLength(3);
    await waitFor(() => expect(useGameStore.getState().ui.notifications.some(
      (item) => item.id === 'notification-llm-event-fallback',
    )).toBe(true));
  });
});
