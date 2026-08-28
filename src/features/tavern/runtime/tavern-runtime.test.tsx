import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearAllData } from '../../../sillytavern/database';
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
});

afterEach(async () => {
  await clearAllData();
});

describe('TavernProvider', () => {
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
