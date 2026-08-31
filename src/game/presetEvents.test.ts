import { describe, expect, test } from 'vitest';
import { createSeededRandom } from './random';
import { selectPresetEvent } from './presetEvents';
import type { MemoryFragment, MazeNodeType } from './types';

const fragments: MemoryFragment[] = [
  { id: 'fragment-rain', name: '逆流的雨声', kind: 'emotion', tags: ['雨幕', '听觉'] },
];

function select(seed: string, nodeType: MazeNodeType = 'encounter') {
  return selectPresetEvent({
    randomState: createSeededRandom(seed),
    nodeType,
    sanity: 64,
    overload: 38,
    fragments,
  });
}

describe('deterministic offline preset events', () => {
  test('replays the same event and random cursor from the same state', () => {
    expect(select('event-replay')).toEqual(select('event-replay'));
    expect(select('event-replay').randomState.draws).toBe(1);
  });

  test.each<MazeNodeType>(['combat', 'emergency-combat', 'safehouse', 'shop', 'encounter', 'dilemma', 'unknown', 'boss'])(
    'selects a %s event with two or three choices',
    (nodeType) => {
      const { event } = select(`event-${nodeType}`, nodeType);

      expect(event.nodeType).toBe(nodeType);
      expect(event.choices.length).toBeGreaterThanOrEqual(2);
      expect(event.choices.length).toBeLessThanOrEqual(3);
      expect(new Set(event.choices.map((choice) => choice.id)).size).toBe(event.choices.length);
    },
  );

  test('keeps player-facing text separate from typed numeric effects', () => {
    const { event } = select('event-effects');

    for (const choice of event.choices) {
      expect(choice).toMatchObject({
        id: expect.any(String),
        label: expect.any(String),
        description: expect.any(String),
        effect: {
          sanityDelta: expect.any(Number),
          overloadDelta: expect.any(Number),
        },
      });
      expect(choice.label).not.toMatch(/[+-]\d/);
      expect(choice.description).not.toMatch(/[+-]\d/);
    }
  });

  test('does not mutate the supplied fragments or random state', () => {
    const randomState = createSeededRandom('event-immutable');
    const inputFragments = structuredClone(fragments);
    const randomSnapshot = structuredClone(randomState);

    selectPresetEvent({
      randomState,
      nodeType: 'safehouse',
      sanity: 42,
      overload: 76,
      fragments: inputFragments,
    });

    expect(randomState).toEqual(randomSnapshot);
    expect(inputFragments).toEqual(fragments);
  });
});
