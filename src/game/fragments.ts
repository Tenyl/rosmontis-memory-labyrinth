import type {
  FragmentOverflowChoice,
  FragmentRuleState,
  DiaryDraft,
  MemoryFragment,
  RuleEvent,
} from './types';

export interface FragmentResolution {
  accepted: boolean;
  reason?: string;
  state: FragmentRuleState;
  events: RuleEvent[];
  diaryDraft: DiaryDraft | null;
}

export function acquireFragment(
  state: FragmentRuleState,
  fragment: MemoryFragment,
): FragmentResolution {
  const exists = [...state.inventory.fragments, ...state.inventory.coreFragments]
    .some((item) => item.id === fragment.id)
    || state.inventory.pendingFragment?.id === fragment.id;
  if (exists) return rejected(state, '记忆碎片已经存在。');

  if (fragment.kind === 'core') {
    return accepted({
      ...state,
      inventory: {
        ...state.inventory,
        coreFragments: [...state.inventory.coreFragments, fragment],
      },
    }, [{ type: 'fragment.acquired', fragmentId: fragment.id, kind: fragment.kind }]);
  }

  if (state.inventory.fragments.length < state.inventory.capacity) {
    return accepted({
      ...state,
      inventory: {
        ...state.inventory,
        fragments: [...state.inventory.fragments, fragment],
      },
    }, [{ type: 'fragment.acquired', fragmentId: fragment.id, kind: fragment.kind }]);
  }

  return accepted({
    ...state,
    phase: 'fragment-overflow',
    inventory: { ...state.inventory, pendingFragment: fragment },
  }, [{ type: 'fragment.overflow', fragmentId: fragment.id }]);
}

export function resolveFragmentOverflow(
  state: FragmentRuleState,
  choice: FragmentOverflowChoice,
): FragmentResolution {
  const pending = state.inventory.pendingFragment;
  if (state.phase !== 'fragment-overflow' || !pending) {
    return rejected(state, '当前没有待处理的碎片溢出。');
  }

  if (choice.type === 'discard-pending') {
    return accepted({
      ...state,
      phase: 'exploring',
      inventory: { ...state.inventory, pendingFragment: null },
    }, [{ type: 'fragment.discarded', fragmentId: pending.id }]);
  }

  if (state.inventory.coreFragments.some((fragment) => fragment.id === choice.fragmentId)) {
    return rejected(state, '核心碎片不能被遗忘或替换。');
  }
  if (!state.inventory.fragments.some((fragment) => fragment.id === choice.fragmentId)) {
    return rejected(state, '要遗忘的记忆碎片不存在。');
  }

  const forgotten = state.inventory.fragments.find((fragment) => fragment.id === choice.fragmentId)!;
  const diaryDraft = choice.type === 'transcribe-and-replace'
    ? createTranscriptionDraft(forgotten)
    : null;
  const events: RuleEvent[] = [{
    type: 'fragment.replaced',
    forgottenFragmentId: choice.fragmentId,
    acquiredFragmentId: pending.id,
  }];
  if (diaryDraft) {
    events.push({ type: 'fragment.transcribed', fragmentId: forgotten.id, diaryDraftId: diaryDraft.id });
  }

  return accepted({
    ...state,
    phase: 'exploring',
    inventory: {
      ...state.inventory,
      fragments: state.inventory.fragments.map((fragment) => (
        fragment.id === choice.fragmentId ? pending : fragment
      )),
      pendingFragment: null,
    },
  }, events, diaryDraft);
}

function createTranscriptionDraft(fragment: MemoryFragment): DiaryDraft {
  return {
    id: `diary-transcription-${fragment.id}`,
    triggerKey: `fragment-transcribed:${fragment.id}`,
    title: `我请博士替我记住：${fragment.name}`,
    body: `我把“${fragment.name}”从现在的记忆槽里放下了。博士会替我把它写在手记里，所以这不是彻底忘记。`,
    source: 'local',
    createdAt: 'pending-write',
  };
}

function accepted(state: FragmentRuleState, events: RuleEvent[], diaryDraft: DiaryDraft | null = null): FragmentResolution {
  return { accepted: true, state, events, diaryDraft };
}

function rejected(state: FragmentRuleState, reason: string): FragmentResolution {
  return { accepted: false, reason, state, events: [], diaryDraft: null };
}
