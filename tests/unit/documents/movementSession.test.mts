import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { MovementSession } from '@documents/combat/combatant/movementSession.mjs';
import { getMovementSession, resetMovementSession, setMovementSession } from '@documents/combat/combatant/movementSession.mjs';
import { describe, expect, it } from 'vitest';

const buildCombatant = (stored?: Record<string, unknown>): CombatantDnd35e => {
  const flags: Record<string, unknown> = { ...stored };
  return {
    getFlag: (_scope: string, key: string) => flags[key],
    setFlag: async (_scope: string, key: string, value: unknown) => {
      flags[key] = value;
    },
  } as unknown as CombatantDnd35e;
};

describe('getMovementSession', () => {
  it('returns full defaults when no flag has ever been stored', () => {
    expect(getMovementSession(buildCombatant())).toEqual({
      category: null,
      cumulativeCost: 0,
      spentTiers: [],
      firstOrigin: null,
      messageId: null,
      lastMovementAction: null,
      fullRoundMove: null,
      proneToggle: null,
    });
  });

  it('merges a partially-stored session with defaults', () => {
    const combatant = buildCombatant({ movementSession: { category: 'normal', cumulativeCost: 15 } });
    const session = getMovementSession(combatant);
    expect(session.category).toBe('normal');
    expect(session.cumulativeCost).toBe(15);
    expect(session.spentTiers).toEqual([]);
    expect(session.fullRoundMove).toBeNull();
  });
});

describe('setMovementSession', () => {
  it('persists the exact session object passed in, verbatim', async () => {
    const combatant = buildCombatant();
    const session: MovementSession = {
      category: 'step',
      cumulativeCost: 5,
      spentTiers: ['move'],
      firstOrigin: { x: 100, y: 200, elevation: 0 },
      messageId: 'msg1',
      lastMovementAction: 'fiveFootStep',
      fullRoundMove: null,
      proneToggle: null,
    };
    await setMovementSession(combatant, session);
    expect(getMovementSession(combatant)).toEqual(session);
  });
});

describe('resetMovementSession', () => {
  it('wipes an in-progress session back to full defaults', async () => {
    const combatant = buildCombatant({
      movementSession: {
        category: 'normal',
        cumulativeCost: 40,
        spentTiers: ['move', 'standard'],
        firstOrigin: { x: 0, y: 0, elevation: 0 },
        messageId: 'msg1',
        lastMovementAction: 'walk',
        fullRoundMove: { movementId: 'm1', spentTiers: ['move', 'standard'], messageId: 'msg1' },
        proneToggle: null,
      },
    });
    await resetMovementSession(combatant);
    expect(getMovementSession(combatant)).toEqual({
      category: null,
      cumulativeCost: 0,
      spentTiers: [],
      firstOrigin: null,
      messageId: null,
      lastMovementAction: null,
      fullRoundMove: null,
      proneToggle: null,
    });
  });
});
