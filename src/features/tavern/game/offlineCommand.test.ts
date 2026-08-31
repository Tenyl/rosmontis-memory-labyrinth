import { classifyOfflineCommand } from './offlineCommand';

test.each([
  ['命令巨剑破壁攻击', 'combat', 'breach'],
  ['让迷迭香进入守望阵位', 'safehouse', 'watch'],
  ['认知侦测奇境', 'encounter', 'perception'],
  ['与记忆核心共鸣', 'boss', 'resonance'],
] as const)('maps recognized offline command %s to a defined action', (command, nodeType, swordId) => {
  expect(classifyOfflineCommand(command, nodeType)).toMatchObject({
    kind: 'action',
    action: { type: 'use-greatsword', action: { swordId, nodeType } },
  });
});

test('keeps memory inspection in the local narrative lane', () => {
  expect(classifyOfflineCommand('让迷迭香读取残留意识', 'safehouse')).toMatchObject({
    kind: 'narrative',
    topic: 'memory',
  });
});

test('returns node-specific recovery guidance instead of guessing', () => {
  const result = classifyOfflineCommand('向不存在的月亮唱歌', 'encounter');
  expect(result).toMatchObject({ kind: 'recovery', message: expect.stringContaining('未识别') });
  if (result.kind === 'recovery') expect(result.suggestions).toContain('认知侦测奇境');
});
