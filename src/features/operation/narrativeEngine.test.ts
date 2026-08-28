import { createLocalNarrativeEngine } from './narrativeEngine';

afterEach(() => {
  vi.useRealTimers();
});

test('streams the residual-memory scenario and returns its tactical outcome', async () => {
  vi.useFakeTimers();
  const chunks: string[] = [];
  const engine = createLocalNarrativeEngine();

  const outcomePromise = engine.run('让迷迭香读取残留意识', (chunk) => chunks.push(chunk));
  await vi.runAllTimersAsync();
  const outcome = await outcomePromise;

  expect(chunks.join('')).toContain('墙体后的儿童合唱');
  expect(outcome.operatorStress).toBe(57);
  expect(outcome.unlockedNodeId).toBe('memory-deep-chorus');
  expect(outcome.archiveRecordId).toBe('archive-deep-chorus');
});

test('uses the configured presentation speed for local narrative chunks', async () => {
  vi.useFakeTimers();
  const delays: number[] = [];
  const scheduler = {
    schedule(callback: () => void, delayMs: number) {
      delays.push(delayMs);
      return setTimeout(callback, 0);
    },
    cancel(handle: ReturnType<typeof setTimeout>) {
      clearTimeout(handle);
    },
  };
  const engine = createLocalNarrativeEngine(scheduler, 'immersive');

  const outcomePromise = engine.run('检查西侧隔离门', () => undefined);
  await vi.runAllTimersAsync();
  await outcomePromise;

  expect(delays[0]).toBe(300);
  expect(delays.slice(1)).toContain(520);
});
