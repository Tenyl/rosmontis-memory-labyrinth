import { classifyOfflineCommand, createLocalNarrativeEngine } from './narrativeEngine';

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

test.each([
  ['命令巨剑破壁攻击', 'combat', 'breach'],
  ['让迷迭香进入守望阵位', 'safehouse', 'watch'],
  ['扫描空白断层并进行战术感知', 'encounter', 'perception'],
  ['与记忆核心共鸣', 'boss', 'resonance'],
] as const)('maps recognized offline command %s to a defined action', (command, nodeType, swordId) => {
  expect(classifyOfflineCommand(command, nodeType)).toMatchObject({
    kind: 'action',
    action: {
      type: 'use-greatsword',
      action: { swordId, nodeType },
    },
  });
});

test('keeps investigation commands in the local narrative lane', () => {
  expect(classifyOfflineCommand('让迷迭香读取残留意识', 'safehouse')).toMatchObject({
    kind: 'narrative',
    topic: 'memory',
  });
});

test('returns recovery suggestions instead of guessing an unknown command', () => {
  const result = classifyOfflineCommand('向不存在的月亮唱歌', 'encounter');

  expect(result).toMatchObject({
    kind: 'recovery',
    message: expect.stringContaining('未识别'),
  });
  if (result.kind === 'recovery') {
    expect(result.suggestions).toHaveLength(3);
    expect(result.suggestions).toContain('扫描空白断层');
  }
});

test('returns recovery guidance when a sword command is illegal at the current node', () => {
  expect(classifyOfflineCommand('使用破壁攻击', 'safehouse')).toMatchObject({
    kind: 'recovery',
    message: expect.stringContaining('当前节点不能使用破壁'),
  });
});
