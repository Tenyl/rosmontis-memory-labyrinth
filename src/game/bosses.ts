import type { ComfortGesture } from './types';

export type BossKind = 'gatekeeper' | 'closed-heart' | 'mindsea-exit';
export type BossPhase = 'shield' | 'stability' | 'reconciliation';

export interface BossDefinition {
  kind: BossKind;
  name: string;
  phases: 1 | 2;
  shieldLabel: string;
  reconciliationLabel: string | null;
}

export const BOSS_CATALOG: Record<number, BossDefinition> = {
  1: gatekeeper('表层守门残响'),
  2: gatekeeper('雨幕守门残响'),
  3: gatekeeper('实验室监护残响'),
  4: gatekeeper('心防守门残响'),
  5: {
    kind: 'closed-heart', name: '封闭之心', phases: 2,
    shieldLabel: '破除心防', reconciliationLabel: '拥抱与共鸣',
  },
};

export interface BossBattleState {
  bossKind: BossKind;
  phase: BossPhase;
  enemyIntegrity: number;
  coreStability: number;
  resolved: boolean;
}

export type BossAction =
  | { type: 'breach'; power: number }
  | { type: 'resonance'; power: number }
  | { type: 'comfort'; gesture: ComfortGesture };

export interface BossResolution {
  accepted: boolean;
  reason?: string;
  state: BossBattleState;
}

export function getBossDefinition(floor: number): BossDefinition {
  return BOSS_CATALOG[floor] ?? {
    kind: 'mindsea-exit', name: `心海航标 · ${floor}`, phases: 2,
    shieldLabel: '校准航标', reconciliationLabel: '同步归航',
  };
}

export function resolveBossAction(state: BossBattleState, action: BossAction): BossResolution {
  if (state.resolved) return rejected(state, '这段记忆已经安静下来了。');
  const reconciliation = state.phase === 'reconciliation' || state.phase === 'stability';

  if (action.type === 'breach') {
    if (reconciliation) return rejected(state, '她已经放下心防了，博士……不要再攻击我。');
    const enemyIntegrity = Math.max(0, state.enemyIntegrity - Math.max(0, action.power));
    if (enemyIntegrity > 0) return accepted({ ...state, enemyIntegrity });
    if (state.bossKind === 'gatekeeper') return accepted({ ...state, enemyIntegrity: 0, resolved: true });
    return accepted({ ...state, enemyIntegrity: 0, phase: 'reconciliation' });
  }

  if (!reconciliation) return rejected(state, '必须先破除心防，才能让共鸣抵达她身边。');
  if (state.bossKind === 'gatekeeper') return rejected(state, '守门残响不需要进行心智和解。');
  const power = action.type === 'resonance'
    ? action.power
    : action.gesture === 'hold-hand' ? 20 : 10;
  const coreStability = Math.min(100, state.coreStability + Math.max(0, power));
  return accepted({ ...state, coreStability, resolved: coreStability >= 100 });
}

function gatekeeper(name: string): BossDefinition {
  return { kind: 'gatekeeper', name, phases: 1, shieldLabel: '击破守门残响', reconciliationLabel: null };
}

function accepted(state: BossBattleState): BossResolution {
  return { accepted: true, state };
}

function rejected(state: BossBattleState, reason: string): BossResolution {
  return { accepted: false, reason, state };
}
