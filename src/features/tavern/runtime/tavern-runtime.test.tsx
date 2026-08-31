import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearAllData } from '../../../sillytavern/database';
import { buildDemoState } from '../../../data/demoData';
import { useGameStore } from '../../../store/gameStore';
import { TavernProvider } from './TavernProvider';
import type { TavernTransport } from './tavern-transport';
import { useTavern } from './useTavern';

const completeTransport: TavernTransport = {
  mode: 'local',
  async *stream() {
    yield '<maintext>雨幕中的门牌正在改变。</maintext>';
    yield '<option>记录编号</option><sum>门牌出现异常</sum><vars>{"sanity":55}</vars>';
  },
};

function wrapperFor(transport: TavernTransport) {
  return function RuntimeWrapper({ children }: PropsWithChildren) {
    return <TavernProvider transport={transport}>{children}</TavernProvider>;
  };
}

beforeEach(async () => {
  await clearAllData();
  useGameStore.setState(buildDemoState());
});

afterEach(async () => {
  await clearAllData();
});

describe('TavernProvider', () => {
  it('adds an independent roleplay boundary to character chat prompts', async () => {
    let requestMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    const inspectingTransport: TavernTransport = {
      mode: 'remote',
      async *stream(request) {
        requestMessages = request.messages;
        yield '<maintext>博士，我在听。</maintext>';
      },
    };
    const runtime = renderHook(() => useTavern(), { wrapper: wrapperFor(inspectingTransport) });
    await waitFor(() => expect(runtime.result.current.initialized).toBe(true));

    await act(async () => {
      const chatId = await runtime.result.current.createChat('私人对话', { purpose: 'character-chat' });
      await runtime.result.current.sendMessage('只是聊聊天', chatId);
    });

    expect(requestMessages.at(-1)).toMatchObject({
      role: 'system',
      content: expect.stringContaining('独立角色对话'),
    });
    expect(requestMessages.at(-1)?.content).toContain('不得读取或修改迷宫 Run');
    runtime.unmount();
  });

  it('appends each structured game-run summary exactly once', async () => {
    const runtime = renderHook(() => useTavern(), { wrapper: wrapperFor(completeTransport) });
    await waitFor(() => expect(runtime.result.current.initialized).toBe(true));
    let chatId = '';
    await act(async () => {
      chatId = await runtime.result.current.createChat('摘要去重', {
        purpose: 'game-run',
        runId: 'run-summary',
      });
      const summary = {
        triggerKey: 'node:run-summary:f1-n1',
        kind: 'node' as const,
        runId: 'run-summary',
        floor: 1,
        nodeId: 'f1-n1',
        text: '迷迭香完成了安全屋节点。',
        createdAt: '2026-08-31T12:00:00.000Z',
      };
      await runtime.result.current.appendRunSummary(chatId, summary);
      await runtime.result.current.appendRunSummary(chatId, summary);
    });

    expect(runtime.result.current.chats.find((chat) => chat.id === chatId)?.summaries).toEqual([
      expect.objectContaining({ triggerKey: 'node:run-summary:f1-n1', kind: 'node' }),
    ]);
    runtime.unmount();
  });

  it('keeps character chat variables isolated from the game projection', async () => {
    const runtime = renderHook(() => useTavern(), { wrapper: wrapperFor(completeTransport) });
    await waitFor(() => expect(runtime.result.current.initialized).toBe(true));

    let chatId = '';
    await act(async () => {
      chatId = await runtime.result.current.createChat('迷迭香对话', {
        purpose: 'character-chat',
      });
      await runtime.result.current.sendMessage('你还好吗？', chatId);
    });

    expect(runtime.result.current.chats.find((chat) => chat.id === chatId)).toMatchObject({
      purpose: 'character-chat',
      runId: null,
      variables: { sanity: 55 },
    });
    expect(useGameStore.getState().rosmontis.sanity).toBe(100);
    expect(useGameStore.getState().tavernProjection).toEqual({ activeSessionId: null, sessions: {} });
    runtime.unmount();
  });

  it('retains projection for an explicitly addressed game-run session', async () => {
    const runtime = renderHook(() => useTavern(), { wrapper: wrapperFor(completeTransport) });
    await waitFor(() => expect(runtime.result.current.initialized).toBe(true));

    let chatId = '';
    await act(async () => {
      chatId = await runtime.result.current.createChat('潜入记录', {
        purpose: 'game-run',
        runId: useGameStore.getState().run.id,
      });
      await runtime.result.current.sendMessage('检查门牌', chatId);
    });

    expect(useGameStore.getState().operators.byId.rosmontis.sanity).toBe(55);
    expect(useGameStore.getState().tavernProjection.activeSessionId).toBe(chatId);
    runtime.unmount();
  });

  it('creates an active chat and restores it after remount', async () => {
    const first = renderHook(() => useTavern(), { wrapper: wrapperFor(completeTransport) });
    await waitFor(() => expect(first.result.current.initialized).toBe(true));

    await act(async () => {
      await first.result.current.createChat('认知测试');
    });
    expect(first.result.current.activeChat?.name).toBe('认知测试');
    first.unmount();

    const second = renderHook(() => useTavern(), { wrapper: wrapperFor(completeTransport) });
    await waitFor(() => expect(second.result.current.initialized).toBe(true));
    expect(second.result.current.activeChat?.name).toBe('认知测试');
    second.unmount();
  });

  it('commits parsed assistant content and variables after a complete stream', async () => {
    const runtime = renderHook(() => useTavern(), { wrapper: wrapperFor(completeTransport) });
    await waitFor(() => expect(runtime.result.current.initialized).toBe(true));

    await act(async () => {
      await runtime.result.current.sendMessage('检查门牌');
    });

    expect(runtime.result.current.status).toBe('complete');
    expect(runtime.result.current.activeChat?.messages.at(-1)).toMatchObject({
      role: 'assistant',
      content: '雨幕中的门牌正在改变。',
      parsed: { options: ['记录编号'], sum: '门牌出现异常' },
    });
    expect(runtime.result.current.activeChat?.variables).toMatchObject({ sanity: 55 });
    runtime.unmount();
  });

  it('aborts a stream without committing pending variables', async () => {
    const blockingTransport: TavernTransport = {
      mode: 'local',
      async *stream(_request, signal) {
        yield '<maintext>雨声突然变近。</maintext><vars>{"sanity":41}';
        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('已停止', 'AbortError')), { once: true });
        });
      },
    };
    const runtime = renderHook(() => useTavern(), { wrapper: wrapperFor(blockingTransport) });
    await waitFor(() => expect(runtime.result.current.initialized).toBe(true));
    const before = { ...runtime.result.current.activeChat?.variables };

    let sending: Promise<void> | undefined;
    act(() => {
      sending = runtime.result.current.sendMessage('继续深入');
    });
    await waitFor(() => expect(runtime.result.current.status).toBe('streaming'));
    act(() => runtime.result.current.stopGeneration());
    await act(async () => sending);

    expect(runtime.result.current.status).toBe('interrupted');
    expect(runtime.result.current.activeChat?.variables).toEqual(before);
    expect(runtime.result.current.activeChat?.messages.at(-1)?.role).toBe('user');
    runtime.unmount();
  });
});
