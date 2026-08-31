import { describe, expect, it } from 'vitest';
import { createLocalDiaryDraft } from './localDiary';

const snapshot = { runId: 'run-rose', floor: 3, sanity: 62, overload: 74 };

describe('local diary drafts', () => {
  it.each([
    [{ type: 'boss-completed', nodeId: 'floor-3-boss', bossTitle: '冰冷的监护者' } as const, '守门'],
    [{ type: 'floor-completed', floor: 3, floorTitle: '冰冷实验室' } as const, '第三层'],
    [{ type: 'fragment-transcribed', fragmentId: 'rain-note', fragmentName: '雨中的便签' } as const, '记住'],
  ])('creates a first-person stable draft for %j', (trigger, expectedText) => {
    const first = createLocalDiaryDraft(trigger, snapshot);
    const repeated = createLocalDiaryDraft(trigger, snapshot);
    expect(first.id).toBe(repeated.id);
    expect(first.triggerKey).toBe(repeated.triggerKey);
    expect(first.body).toContain('我');
    expect(`${first.title}${first.body}`).toContain(expectedText);
  });
});
