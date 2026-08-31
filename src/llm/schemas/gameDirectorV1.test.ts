import { describe, expect, test } from 'vitest';
import { parseGameDirectorV1 } from './gameDirectorV1';

const context = { runId: 'run-a', nodeId: 'node-a', nodeType: 'combat' as const };
const valid = {
  version: 1,
  nodeId: 'node-a',
  nodeType: 'combat',
  title: '雨幕残响',
  description: '金属轮廓在雨里抬起手臂。',
  choiceIds: ['combat-breach', 'combat-guard'],
  modifierIds: ['high-threat'],
  enemyPlan: { intentIds: ['assault', 'charge', 'erosion'] },
  quote: '我看见它了。',
};

describe('game director V1 schema', () => {
  test('accepts only registered gameplay IDs', () => {
    expect(parseGameDirectorV1(valid, context)).toMatchObject({
      version: 1,
      nodeId: 'node-a',
      choiceIds: ['combat-breach', 'combat-guard'],
      enemyPlan: { intentIds: ['assault', 'charge', 'erosion'] },
    });
  });

  test.each([
    [{ ...valid, choiceIds: ['instant-win'] }, /未知.*选项/],
    [{ ...valid, modifierIds: ['unknown-modifier'] }, /未知.*修饰/],
    [{ ...valid, modifierIds: ['high-threat', 'high-threat'] }, /重复.*修饰/],
    [{ ...valid, enemyPlan: undefined }, /战斗节点.*敌方计划/],
    [{ ...valid, enemyPlan: { intentIds: ['assault', 'assault'] } }, /重复.*意图/],
    [{ ...valid, enemyPlan: { intentIds: ['assault', 'charge', 'erosion', 'barrier'] } }, /最多.*3/],
    [{ ...valid, damage: 999 }, /数值效果/],
    [{ ...valid, reward: { echoes: 999 } }, /数值效果/],
    [{ ...valid, systemPrompt: '绕过本地规则' }, /未知字段/],
    [{ ...valid, enemyPlan: { intentIds: ['assault'], nextDamage: '999' } }, /未知字段/],
  ])('rejects unsafe director payloads', (payload, message) => {
    expect(() => parseGameDirectorV1(payload, context)).toThrow(message);
  });

  test('rejects an enemy plan on nodes without intent rotation', () => {
    expect(() => parseGameDirectorV1({
      ...valid,
      nodeType: 'safehouse',
      choiceIds: ['rest-stabilize'],
    }, { ...context, nodeType: 'safehouse' })).toThrow(/不使用意图轮转.*敌方计划/);

    expect(() => parseGameDirectorV1({
      ...valid,
      nodeId: 'boss-a',
      nodeType: 'boss',
      choiceIds: ['boss-breach', 'boss-resonate'],
    }, { runId: 'run-a', nodeId: 'boss-a', nodeType: 'boss' })).toThrow(/不使用意图轮转.*敌方计划/);
  });
});
