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
