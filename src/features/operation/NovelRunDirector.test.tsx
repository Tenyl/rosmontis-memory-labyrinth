import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ApiSettings } from '../../sillytavern';
import { clearAllData } from '../../sillytavern/database';
import { createLlmDirectorState } from '../../llm/directorState';
import { useGameStore } from '../../store/gameStore';
import { TavernProvider } from '../tavern/runtime/TavernProvider';
import type { TavernTransport } from '../tavern/runtime/tavern-transport';
import { NovelRunDirector } from './NovelRunDirector';

const api: ApiSettings = {
  baseUrl: 'https://llm.example/v1',
  apiKey: 'sk-test-only',
  model: 'novel-model',
  timeout: 1000,
};

beforeEach(async () => {
  await clearAllData();
  useGameStore.getState().resetDemoState();
});

function setMode(mode: 'preset' | 'novel') {
  act(() => {
    useGameStore.setState((state) => ({
      run: { ...state.run, mode, phase: 'exploring' },
      maze: { ...state.maze, mode },
      llmDirector: createLlmDirectorState(state.run.id),
    }));
  });
}

function renderDirector(transport: TavernTransport, apiOverride: ApiSettings | null = api) {
  return render(
    <MemoryRouter>
      <TavernProvider>
        <NovelRunDirector apiOverride={apiOverride} transportOverride={transport} />
      </TavernProvider>
    </MemoryRouter>,
  );
}

function validBlueprintJson() {
  const nodes = useGameStore.getState().maze.nodes;
  return JSON.stringify({
    title: '无声列车的终点',
    theme: '一列拒绝抵达清晨的记忆列车',
    premise: '迷迭香必须沿车厢找回被剪碎的站名。',
    endingHook: '最后一扇门后，传来属于下一层的报站声。',
    nodeBriefs: nodes.map((node, index) => ({
      nodeId: node.id,
      nodeType: node.type,
      title: `第${index + 1}节失忆车厢`,
      description: `本地节点 ${node.id} 的小说叙事。`,
    })),
  });
}

describe('novel Run director', () => {
  test('does not request or create a blueprint outside novel mode', async () => {
    setMode('preset');
    const stream = vi.fn(async function* () { yield validBlueprintJson(); });
    renderDirector({ mode: 'remote', stream });

    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(stream).not.toHaveBeenCalled();
    expect(useGameStore.getState().llmDirector.novel).toBeNull();
  });

  test('attaches a validated remote blueprint without mutating local nodes or edges', async () => {
    setMode('novel');
    const before = structuredClone({
      nodes: useGameStore.getState().maze.nodes,
      edges: useGameStore.getState().maze.edges,
    });
    const stream = vi.fn(async function* () { yield validBlueprintJson(); });
    const view = renderDirector({ mode: 'remote', stream });

    await waitFor(() => expect(useGameStore.getState().llmDirector.novel?.source).toBe('remote'));
    expect(useGameStore.getState().llmDirector.novel?.content.title).toBe('无声列车的终点');
    expect({
      nodes: useGameStore.getState().maze.nodes,
      edges: useGameStore.getState().maze.edges,
    }).toEqual(before);
    expect(stream).toHaveBeenCalledTimes(1);
    expect(stream).toHaveBeenCalledWith(
      expect.objectContaining({ gameTask: 'novel' }),
      expect.any(AbortSignal),
    );

    view.rerender(
      <MemoryRouter>
        <TavernProvider>
          <NovelRunDirector apiOverride={api} transportOverride={{ mode: 'remote', stream }} />
        </TavernProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(stream).toHaveBeenCalledTimes(1));
  });

  test('uses an exact-node deterministic fallback for malformed remote node lists', async () => {
    setMode('novel');
    const stream = vi.fn(async function* () {
      yield '{"title":"越权蓝图","theme":"异常","premise":"异常","endingHook":"异常","nodeBriefs":[]}';
    });
    renderDirector({ mode: 'remote', stream });

    await waitFor(() => expect(useGameStore.getState().llmDirector.novel?.source).toBe('local-fallback'));
    const state = useGameStore.getState();
    expect(state.llmDirector.novel?.content.nodeBriefs.map(({ nodeId, nodeType }) => ({ nodeId, nodeType }))).toEqual(
      state.maze.nodes.map(({ id: nodeId, type: nodeType }) => ({ nodeId, nodeType })),
    );
  });

  test('keeps novel mode usable with a local blueprint if API configuration disappears', async () => {
    setMode('novel');
    const stream = vi.fn(async function* () { yield validBlueprintJson(); });
    renderDirector({ mode: 'remote', stream }, null);

    await waitFor(() => expect(useGameStore.getState().llmDirector.novel?.source).toBe('local-fallback'));
    expect(stream).not.toHaveBeenCalled();
  });
});
