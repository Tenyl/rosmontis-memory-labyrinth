import { describe, expect, test } from 'vitest';
import { acquireFragment, resolveFragmentOverflow } from './fragments';
import type { FragmentRuleState, MemoryFragment } from './types';

const fragments: Record<string, MemoryFragment> = {
  rain: { id: 'fragment-rain', name: '倒流的雨声', kind: 'emotion', tags: ['感知'] },
  ward: { id: 'fragment-ward', name: '空白病房', kind: 'pain', tags: ['守望'] },
  bell: { id: 'fragment-bell', name: '凌晨铃声', kind: 'skill', tags: ['共鸣'] },
  core: { id: 'fragment-core-01', name: '核心记忆：名字', kind: 'core', tags: ['核心'] },
};

function buildState(): FragmentRuleState {
  return {
    phase: 'exploring',
    inventory: {
      capacity: 2,
      fragments: [],
      coreFragments: [],
      pendingFragment: null,
    },
  };
}

describe('memory fragment acquisition', () => {
  test('acquires a normal fragment into an available slot without mutating prior state', () => {
    const before = buildState();
    const resolution = acquireFragment(before, fragments.rain);

    expect(resolution.accepted).toBe(true);
    expect(resolution.state).not.toBe(before);
    expect(resolution.state.inventory.fragments).toEqual([fragments.rain]);
    expect(resolution.state.phase).toBe('exploring');
    expect(before.inventory.fragments).toEqual([]);
  });

  test('rejects duplicate IDs across normal and core collections', () => {
    const before = buildState();
    before.inventory.coreFragments = [fragments.core];

    const resolution = acquireFragment(before, { ...fragments.core, name: '伪造核心' });

    expect(resolution).toMatchObject({ accepted: false, state: before, reason: '记忆碎片已经存在。', events: [] });
  });

  test('stores core fragments outside normal capacity and protects them from overflow', () => {
    const before = buildState();
    before.inventory.fragments = [fragments.rain, fragments.ward];

    const resolution = acquireFragment(before, fragments.core);

    expect(resolution.accepted).toBe(true);
    expect(resolution.state.inventory.fragments).toEqual([fragments.rain, fragments.ward]);
    expect(resolution.state.inventory.coreFragments).toEqual([fragments.core]);
    expect(resolution.state.inventory.pendingFragment).toBeNull();
    expect(resolution.state.phase).toBe('exploring');
  });

  test('pauses the run with a pending choice when normal slots overflow', () => {
    const before = buildState();
    before.inventory.fragments = [fragments.rain, fragments.ward];

    const resolution = acquireFragment(before, fragments.bell);

    expect(resolution.accepted).toBe(true);
    expect(resolution.state.phase).toBe('fragment-overflow');
    expect(resolution.state.inventory.fragments).toEqual([fragments.rain, fragments.ward]);
    expect(resolution.state.inventory.pendingFragment).toEqual(fragments.bell);
    expect(resolution.events).toEqual([{ type: 'fragment.overflow', fragmentId: fragments.bell.id }]);
  });
});

describe('forced forgetting choice', () => {
  function buildOverflowState() {
    const state = buildState();
    state.phase = 'fragment-overflow';
    state.inventory.fragments = [fragments.rain, fragments.ward];
    state.inventory.coreFragments = [fragments.core];
    state.inventory.pendingFragment = fragments.bell;
    return state;
  }

  test('can discard the pending fragment and resume exploration', () => {
    const resolution = resolveFragmentOverflow(buildOverflowState(), { type: 'discard-pending' });

    expect(resolution.accepted).toBe(true);
    expect(resolution.state.phase).toBe('exploring');
    expect(resolution.state.inventory.pendingFragment).toBeNull();
    expect(resolution.state.inventory.fragments).toEqual([fragments.rain, fragments.ward]);
    expect(resolution.events).toEqual([{ type: 'fragment.discarded', fragmentId: fragments.bell.id }]);
  });

  test('can replace a normal fragment and resume exploration', () => {
    const resolution = resolveFragmentOverflow(buildOverflowState(), { type: 'replace', fragmentId: fragments.rain.id });

    expect(resolution.accepted).toBe(true);
    expect(resolution.state.phase).toBe('exploring');
    expect(resolution.state.inventory.fragments).toEqual([fragments.bell, fragments.ward]);
    expect(resolution.state.inventory.pendingFragment).toBeNull();
    expect(resolution.events).toEqual([{
      type: 'fragment.replaced',
      forgottenFragmentId: fragments.rain.id,
      acquiredFragmentId: fragments.bell.id,
    }]);
  });

  test('can transcribe a forgotten fragment into a diary draft before replacement', () => {
    const resolution = resolveFragmentOverflow(buildOverflowState(), {
      type: 'transcribe-and-replace',
      fragmentId: fragments.rain.id,
    });

    expect(resolution.accepted).toBe(true);
    expect(resolution.state.inventory.fragments).toEqual([fragments.bell, fragments.ward]);
    expect(resolution.diaryDraft).toMatchObject({
      id: `diary-transcription-${fragments.rain.id}`,
      triggerKey: `fragment-transcribed:${fragments.rain.id}`,
      source: 'local',
    });
    expect(resolution.diaryDraft?.body).toContain(fragments.rain.name);
    expect(resolution.events).toContainEqual({
      type: 'fragment.transcribed',
      fragmentId: fragments.rain.id,
      diaryDraftId: `diary-transcription-${fragments.rain.id}`,
    });
  });

  test.each([
    { type: 'replace' as const, fragmentId: fragments.core.id, reason: /核心碎片/ },
    { type: 'replace' as const, fragmentId: 'missing', reason: /不存在/ },
  ])('rejects invalid replacement $fragmentId without mutation', (choice) => {
    const before = buildOverflowState();
    const snapshot = structuredClone(before);
    const resolution = resolveFragmentOverflow(before, choice);

    expect(resolution.accepted).toBe(false);
    expect(resolution.reason).toMatch(choice.reason);
    expect(resolution.state).toBe(before);
    expect(resolution.state).toEqual(snapshot);
    expect(resolution.events).toEqual([]);
  });

  test('rejects choices when no overflow is pending', () => {
    const before = buildState();
    expect(resolveFragmentOverflow(before, { type: 'discard-pending' })).toMatchObject({
      accepted: false,
      state: before,
      reason: '当前没有待处理的碎片溢出。',
    });
  });
});
