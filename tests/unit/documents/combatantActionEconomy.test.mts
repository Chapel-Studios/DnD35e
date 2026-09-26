import { BOTH_HANDS_EQUIP_SLOT, MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT } from '@constants/equipmentSlots.mjs';
import {
  canUseAction,
  canUseAoO,
  canUseHandAttack,
  getActionEconomy,
  markChargedThisTurn,
  markMovedAfterAttack,
  refundAction,
  refundHandBab,
  resetActionEconomy,
  spendAction,
  spendAoO,
  spendHandBab,
} from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Fake CombatantDnd35e backed by an in-memory flag store — enough surface
 * (getFlag/setFlag) for combatantActionEconomy.mts's plain functions, which
 * never touch anything else on the combatant.
 */
const buildCombatant = (stored?: Record<string, unknown>): CombatantDnd35e => {
  const flags: Record<string, unknown> = { ...stored };
  return {
    getFlag: (_scope: string, key: string) => flags[key],
    setFlag: async (_scope: string, key: string, value: unknown) => {
      flags[key] = value;
    },
  } as unknown as CombatantDnd35e;
};

const buildActor = (aooCount: number, bab: number) => ({ system: { aooCount, bab } }) as any;

describe('getActionEconomy', () => {
  it('returns full defaults when no flag has ever been stored', () => {
    const economy = getActionEconomy(buildCombatant());
    expect(economy).toEqual({
      actions: { standard: true, move: true, minor: true, swift: true, aoo: 0 },
      bab: { [MAIN_HAND_EQUIP_SLOT]: 0, [OFF_HAND_EQUIP_SLOT]: 0 },
      used: { standard: false, move: false, minor: false, swift: false, standardAttackUsed: false, movedAfterAttack: false, chargedThisTurn: false },
    });
  });

  it('merges partial stored flags with defaults rather than replacing the whole shape', () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { standard: false } } });
    const economy = getActionEconomy(combatant);
    expect(economy.actions).toEqual({ standard: false, move: true, minor: true, swift: true, aoo: 0 });
    expect(economy.bab).toEqual({ [MAIN_HAND_EQUIP_SLOT]: 0, [OFF_HAND_EQUIP_SLOT]: 0 });
  });
});

describe('resetActionEconomy', () => {
  it('refills bab pools and AoO from the actor, resets actions, clears used flags', async () => {
    const combatant = buildCombatant({
      actionEconomy: {
        actions: { standard: false, move: false, minor: false, swift: false, aoo: 0 },
        bab: { [MAIN_HAND_EQUIP_SLOT]: 0, [OFF_HAND_EQUIP_SLOT]: 0 },
        used: { standard: true, move: true, minor: true, swift: true, standardAttackUsed: true, movedAfterAttack: true, chargedThisTurn: true },
      },
    });
    await resetActionEconomy(combatant, buildActor(3, 6));

    const economy = getActionEconomy(combatant);
    expect(economy.actions).toEqual({ standard: true, move: true, minor: true, swift: true, aoo: 3 });
    expect(economy.bab).toEqual({ [MAIN_HAND_EQUIP_SLOT]: 6, [OFF_HAND_EQUIP_SLOT]: 6 });
    expect(economy.used).toEqual({ standard: false, move: false, minor: false, swift: false, standardAttackUsed: false, movedAfterAttack: false, chargedThisTurn: false });
  });
});

describe('canUseAction / spendAction / refundAction (hierarchy resolution)', () => {
  it('a single standard request spends the standard pool', () => {
    const combatant = buildCombatant();
    expect(canUseAction(combatant, ['standard'])).toEqual(['standard']);
  });

  it('a move request can be covered by the standard pool once move is already spent', () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { move: false } } });
    expect(canUseAction(combatant, ['move'])).toEqual(['standard']);
  });

  it('a minor request can be covered by move or standard, preferring the lowest sufficient tier', () => {
    const combatant = buildCombatant();
    expect(canUseAction(combatant, ['minor'])).toEqual(['minor']);
  });

  it('returns null when nothing remains to cover the request', () => {
    const combatant = buildCombatant({
      actionEconomy: { actions: { standard: false, move: false, minor: false } },
    });
    expect(canUseAction(combatant, ['minor'])).toBeNull();
  });

  it('a compound full-round request (move + standard) is all-or-nothing', () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { standard: false } } });
    // Only move remains — the full-round request can't be covered even though 'move' alone could be.
    expect(canUseAction(combatant, ['move', 'standard'])).toBeNull();
  });

  it('resolves higher-tier requests first so a standard request claims the standard pool before a minor request opportunistically borrows it', () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { move: false } } });
    // Both 'minor' and 'standard' requested; only 'minor' and 'standard' pools remain (move spent).
    // 'standard' must resolve to the real standard pool, leaving 'minor' its own pool.
    const resolved = canUseAction(combatant, ['minor', 'standard']);
    expect(resolved).toEqual(['minor', 'standard']);
  });

  it('spendAction flips both actions and used flags for the resolved pools', async () => {
    const combatant = buildCombatant();
    const spent = await spendAction(combatant, ['move']);
    expect(spent).toEqual(['move']);

    const economy = getActionEconomy(combatant);
    expect(economy.actions.move).toBe(false);
    expect(economy.used.move).toBe(true);
  });

  it('spendAction returns null and spends nothing when the request cannot be covered', async () => {
    const combatant = buildCombatant({
      actionEconomy: { actions: { standard: false, move: false, minor: false } },
    });
    const spent = await spendAction(combatant, ['standard']);
    expect(spent).toBeNull();

    const economy = getActionEconomy(combatant);
    expect(economy.actions).toEqual({ standard: false, move: false, minor: false, swift: true, aoo: 0 });
  });

  it('refundAction restores exactly the pools passed in, independent of canUseAction', async () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { standard: false }, used: { standard: true } } });
    await refundAction(combatant, ['standard']);

    const economy = getActionEconomy(combatant);
    expect(economy.actions.standard).toBe(true);
    expect(economy.used.standard).toBe(false);
  });
});

describe('swift action (isolated pool, capped at one per turn)', () => {
  it('a swift request spends only the swift pool', async () => {
    const combatant = buildCombatant();
    expect(canUseAction(combatant, ['swift'])).toEqual(['swift']);

    const spent = await spendAction(combatant, ['swift']);
    expect(spent).toEqual(['swift']);

    const economy = getActionEconomy(combatant);
    expect(economy.actions).toEqual({ standard: true, move: true, minor: true, swift: false, aoo: 0 });
    expect(economy.used.swift).toBe(true);
  });

  it('cannot be covered by downgrading a spent move or standard action', () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { swift: false } } });
    // Standard and move are both still available, but swift has its own pool and isn't in ACTION_HIERARCHY.
    expect(canUseAction(combatant, ['swift'])).toBeNull();
  });

  it('spending swift does not consume the standard/move/minor pools', async () => {
    const combatant = buildCombatant();
    await spendAction(combatant, ['swift']);

    const economy = getActionEconomy(combatant);
    expect(economy.actions.standard).toBe(true);
    expect(economy.actions.move).toBe(true);
    expect(economy.actions.minor).toBe(true);
  });
});

describe('canUseHandAttack', () => {
  it('is always usable while the standard action is unspent, regardless of BAB/movedAfterAttack', () => {
    const combatant = buildCombatant({ actionEconomy: { used: { movedAfterAttack: true } } });
    expect(canUseHandAttack(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(true);
  });

  it('is blocked once the standard action is spent and the combatant has since moved', () => {
    const combatant = buildCombatant({
      actionEconomy: { actions: { standard: false }, bab: { [MAIN_HAND_EQUIP_SLOT]: 5, [OFF_HAND_EQUIP_SLOT]: 5 }, used: { movedAfterAttack: true } },
    });
    expect(canUseHandAttack(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(false);
  });

  it('falls back to the named hand\'s BAB pool once standard is spent and nothing moved since', () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { standard: false }, bab: { [MAIN_HAND_EQUIP_SLOT]: 5, [OFF_HAND_EQUIP_SLOT]: 0 } } });
    expect(canUseHandAttack(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(true);
    expect(canUseHandAttack(combatant, OFF_HAND_EQUIP_SLOT)).toBe(false);
  });

  it('requires BAB remaining in both pools for a two-handed ("both") attack', () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { standard: false }, bab: { [MAIN_HAND_EQUIP_SLOT]: 5, [OFF_HAND_EQUIP_SLOT]: 0 } } });
    expect(canUseHandAttack(combatant, BOTH_HANDS_EQUIP_SLOT)).toBe(false);

    const bothReady = buildCombatant({ actionEconomy: { actions: { standard: false }, bab: { [MAIN_HAND_EQUIP_SLOT]: 5, [OFF_HAND_EQUIP_SLOT]: 5 } } });
    expect(canUseHandAttack(bothReady, BOTH_HANDS_EQUIP_SLOT)).toBe(true);
  });
});

describe('spendHandBab / refundHandBab', () => {
  it('subtracts from the named hand only, flooring at 0', async () => {
    const combatant = buildCombatant({ actionEconomy: { bab: { [MAIN_HAND_EQUIP_SLOT]: 5, [OFF_HAND_EQUIP_SLOT]: 5 } } });
    await spendHandBab(combatant, MAIN_HAND_EQUIP_SLOT, 10);
    const economy = getActionEconomy(combatant);
    expect(economy.bab[MAIN_HAND_EQUIP_SLOT]).toBe(0);
    expect(economy.bab[OFF_HAND_EQUIP_SLOT]).toBe(5);
  });

  it('\'both\' subtracts the same amount from main and off independently', async () => {
    const combatant = buildCombatant({ actionEconomy: { bab: { [MAIN_HAND_EQUIP_SLOT]: 8, [OFF_HAND_EQUIP_SLOT]: 3 } } });
    await spendHandBab(combatant, BOTH_HANDS_EQUIP_SLOT, 5);
    const economy = getActionEconomy(combatant);
    expect(economy.bab[MAIN_HAND_EQUIP_SLOT]).toBe(3);
    expect(economy.bab[OFF_HAND_EQUIP_SLOT]).toBe(0); // floored at 0, not negative
  });

  it('refundHandBab restores amount capped at the actor\'s current total BAB', async () => {
    const combatant = buildCombatant({ actionEconomy: { bab: { [MAIN_HAND_EQUIP_SLOT]: 2, [OFF_HAND_EQUIP_SLOT]: 2 } } });
    await refundHandBab(combatant, BOTH_HANDS_EQUIP_SLOT, 10, buildActor(0, 6));
    const economy = getActionEconomy(combatant);
    expect(economy.bab[MAIN_HAND_EQUIP_SLOT]).toBe(6);
    expect(economy.bab[OFF_HAND_EQUIP_SLOT]).toBe(6);
  });

  it('refundHandBab on a single hand does not touch the other hand', async () => {
    const combatant = buildCombatant({ actionEconomy: { bab: { [MAIN_HAND_EQUIP_SLOT]: 0, [OFF_HAND_EQUIP_SLOT]: 4 } } });
    await refundHandBab(combatant, MAIN_HAND_EQUIP_SLOT, 3, buildActor(0, 6));
    const economy = getActionEconomy(combatant);
    expect(economy.bab[MAIN_HAND_EQUIP_SLOT]).toBe(3);
    expect(economy.bab[OFF_HAND_EQUIP_SLOT]).toBe(4);
  });
});

describe('canUseAoO / spendAoO', () => {
  it('spendAoO decrements by 1 and returns true while aoo remains', async () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { aoo: 2 } } });
    expect(canUseAoO(combatant)).toBe(true);
    expect(await spendAoO(combatant)).toBe(true);
    expect(getActionEconomy(combatant).actions.aoo).toBe(1);
  });

  it('spendAoO returns false and spends nothing once aoo is exhausted', async () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { aoo: 0 } } });
    expect(canUseAoO(combatant)).toBe(false);
    expect(await spendAoO(combatant)).toBe(false);
    expect(getActionEconomy(combatant).actions.aoo).toBe(0);
  });
});

describe('markChargedThisTurn / markMovedAfterAttack', () => {
  it('markChargedThisTurn sets used.chargedThisTurn without touching other flags', async () => {
    const combatant = buildCombatant();
    await markChargedThisTurn(combatant);
    const economy = getActionEconomy(combatant);
    expect(economy.used.chargedThisTurn).toBe(true);
    expect(economy.used.movedAfterAttack).toBe(false);
  });

  it('markMovedAfterAttack sets used.movedAfterAttack without touching other flags', async () => {
    const combatant = buildCombatant();
    await markMovedAfterAttack(combatant);
    const economy = getActionEconomy(combatant);
    expect(economy.used.movedAfterAttack).toBe(true);
    expect(economy.used.chargedThisTurn).toBe(false);
  });
});
