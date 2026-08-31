import { describe, expect, test } from 'vitest';
import type { MazeNode, MazeNodeType, RunState } from '../game/types';
import { LocalContentDriver } from './contentDriver';

const nodeTypes: MazeNodeType[] = ['combat', 'emergency-combat', 'safehouse', 'shop', 'encounter', 'dilemma', 'unknown', 'boss'];
const run: RunState = {
  id: 'run-local', seed: 'LOCAL', mode: 'preset', phase: 'exploring', turn: 1, floor: 1,
  maxFloor: 5, currentNodeId: 'node', result: null, contentMode: 'local', narrativeStyle: 'tactical',
  aiFailurePolicy: 'ask', aiBinding: { chatId: null, characterId: null, personaId: null, presetId: null, lorebookIds: [] },
};

describe('local content driver parity', () => {
  test.each(nodeTypes)('returns a complete presentation for %s without a transport', (type) => {
    const node: MazeNode = {
      id: `node-${type}`, type, state: 'current', floor: 1, depth: 2, risk: 'B',
      hiddenType: type === 'unknown' ? 'encounter' : null, revealed: type !== 'unknown', modifiers: [],
    };
    const driver = new LocalContentDriver();
    const result = driver.resolveNode({ run: { ...run, currentNodeId: node.id }, node });

    expect(driver).not.toHaveProperty('transport');
    expect(result).toMatchObject({
      version: 1, runId: 'run-local', nodeId: node.id, nodeType: type, source: 'local',
    });
    expect(result.title.length).toBeGreaterThan(0);
    expect(result.description.length).toBeGreaterThan(0);
    expect(result.choiceIds.length).toBeGreaterThan(0);
    if (type === 'combat' || type === 'emergency-combat') {
      expect(result.enemyPlan?.intentIds.length).toBeGreaterThan(0);
    } else {
      expect(result.enemyPlan).toBeUndefined();
    }
  });
});
