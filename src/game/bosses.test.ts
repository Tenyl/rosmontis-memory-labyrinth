import { describe, expect, it } from 'vitest';
import { BOSS_CATALOG, resolveBossAction, type BossBattleState } from './bosses';

const battle = (bossKind: BossBattleState['bossKind']): BossBattleState => ({
  bossKind, phase: 'shield', enemyIntegrity: 30, coreStability: 0, resolved: false,
});

describe('boss state machine', () => {
  it('uses gatekeepers on floors 1-4 and the closed heart on floor 5', () => {
    expect([1, 2, 3, 4].map((floor) => BOSS_CATALOG[floor].kind)).toEqual([
      'gatekeeper', 'gatekeeper', 'gatekeeper', 'gatekeeper',
    ]);
    expect(BOSS_CATALOG[5]).toMatchObject({ kind: 'closed-heart', name: '封闭之心', phases: 2 });
  });

  it('settles a gatekeeper after its shield is breached', () => {
    const result = resolveBossAction(battle('gatekeeper'), { type: 'breach', power: 30 });
    expect(result).toMatchObject({ accepted: true, state: { enemyIntegrity: 0, resolved: true } });
  });

  it('forces the closed heart from breach into reconciliation and rejects damage there', () => {
    const phaseTwo = resolveBossAction(battle('closed-heart'), { type: 'breach', power: 30 });
    expect(phaseTwo.state).toMatchObject({ phase: 'reconciliation', enemyIntegrity: 0, resolved: false });
    expect(resolveBossAction(phaseTwo.state, { type: 'breach', power: 30 })).toMatchObject({
      accepted: false, reason: expect.stringContaining('不要再攻击'),
    });

    let state = phaseTwo.state;
    for (let index = 0; index < 4; index += 1) state = resolveBossAction(state, { type: 'resonance', power: 25 }).state;
    expect(state).toMatchObject({ coreStability: 100, resolved: true });
  });

  it('allows holding her hand during reconciliation', () => {
    const state = { ...battle('closed-heart'), phase: 'reconciliation' as const, enemyIntegrity: 0 };
    expect(resolveBossAction(state, { type: 'comfort', gesture: 'hold-hand' })).toMatchObject({
      accepted: true, state: { coreStability: 20 },
    });
  });
});
