import { clampVital } from './checks';
import { FRAGMENT_KIND_NAMES } from './terminology';
import type { MemoryFragment, MemoryFragmentKind } from './types';

export interface FragmentEffectContext {
  sanity: number;
  overload: number;
  baseDamage: number;
  scoutPoints: number;
  cooldown: number;
}

export interface FragmentEffectResult extends FragmentEffectContext {
  sadnessResistance: number;
  hallucinating: boolean;
}

export const FRAGMENT_EFFECTS: Record<Exclude<MemoryFragmentKind, 'core'>, {
  label: string;
  description: string;
}> = {
  emotion: {
    label: FRAGMENT_KIND_NAMES.emotion,
    description: '恢复稳定性并降低过载；遗忘时留下悲伤阻抗。',
  },
  pain: {
    label: FRAGMENT_KIND_NAMES.pain,
    description: '提高巨剑伤害并累积过载；高过载时引发幻觉干扰。',
  },
  skill: {
    label: FRAGMENT_KIND_NAMES.skill,
    description: '强化侦测能力并缩短巨剑冷却。',
  },
};

export function applyFragmentEffects(
  context: FragmentEffectContext,
  fragments: readonly MemoryFragment[],
): FragmentEffectResult {
  const emotionCount = fragments.filter((fragment) => fragment.kind === 'emotion').length;
  const painCount = fragments.filter((fragment) => fragment.kind === 'pain').length;
  const skillCount = fragments.filter((fragment) => fragment.kind === 'skill').length;
  const overload = clampVital(context.overload - emotionCount * 4 + painCount * 6);

  return {
    sanity: clampVital(context.sanity + emotionCount * 6),
    overload,
    baseDamage: Math.round(context.baseDamage * (1 + painCount * 0.4)),
    scoutPoints: context.scoutPoints + skillCount,
    cooldown: Math.max(0, context.cooldown - skillCount),
    sadnessResistance: emotionCount * 4,
    hallucinating: painCount > 0 && overload >= 70,
  };
}

export function inferLegacyFragmentKind(fragment: { tags?: unknown }): Exclude<MemoryFragmentKind, 'core'> {
  const tags = Array.isArray(fragment.tags) ? fragment.tags.filter((tag): tag is string => typeof tag === 'string') : [];
  if (tags.some((tag) => /实验|痛苦|战斗|破壁/.test(tag))) return 'pain';
  if (tags.some((tag) => /感知|技能|战术|共鸣/.test(tag))) return 'skill';
  return 'emotion';
}
