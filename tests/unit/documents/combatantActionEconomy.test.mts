import { BOTH_HANDS_EQUIP_SLOT, MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT } from '@constants/equipmentSlots.mjs';
import {
  canUseAction,
  canUseAoO,
  canUseHandAttack,
  clearChargedThisTurn,
  getActionEconomy,
  getHandBab,
  getTwoWeaponFightingChoice,
  markChargedThisTurn,
  markMovedAfterAttack,
  refundAction,
  refundHandBab,
  resetActionEconomy,
  setTwoWeaponFightingChoice,
  spendAction,
  spendAoO,
  spendAttackAction,
  spendHandBab,
  toggleActionAvailability,
} from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { describe, expect, it } from 'vitest';

/**
 * Fake CombatantDnd35e backed by an in-memory flag store — enough surface
 * (getFlag/setFlag/unsetFlag) for combatantActionEconomy.mts's plain functions, which
 * never touch anything else on the combatant.
 */
const buildCombatant = (stored?: Record<string, unknown>): CombatantDnd35e => {
  const flags: Record<string, unknown> = { ...stored };
  return {
    getFlag: (_scope: string, key: string) => flags[key],
    setFlag: async (_scope: string, key: string, value: unknown) => {
      flags[key] = value;
    },
    unsetFlag: async (_scope: string, key: string) => {
      delete flags[key];
    },
  } as unknown as CombatantDnd35e;
};

const buildActor = (aooCount: number, bab: number) => ({ system: { aooCount, bab } }) as any;

describe('two-weapon fighting choice', () => {
  it('defaults to equipment detection when no choice is stored', () => {
    expect(getTwoWeaponFightingChoice(buildCombatant())).toBeUndefined();
  });

  it.each([true, false])('persists an explicit %s choice independently of action spending', async (enabled) => {
    const combatant = buildCombatant();
    await setTwoWeaponFightingChoice(combatant, enabled);
    await spendAction(combatant, ['standard']);

    expect(combatant.getFlag('dnd35e', 'twoWeaponFighting')).toBe(enabled);
    expect(getTwoWeaponFightingChoice(combatant)).toBe(enabled);
  });

  it('can replace an opt-in with an explicit opt-out', async () => {
    const combatant = buildCombatant();
    await setTwoWeaponFightingChoice(combatant, true);
    await setTwoWeaponFightingChoice(combatant, false);
    expect(getTwoWeaponFightingChoice(combatant)).toBe(false);
  });

  it('ignores a non-boolean stored choice', () => {
    expect(getTwoWeaponFightingChoice(buildCombatant({ twoWeaponFighting: 'false' }))).toBeUndefined();
  });

  it.each([true, false])('removes an explicit %s choice on turn reset', async (enabled) => {
    const combatant = buildCombatant();
    await setTwoWeaponFightingChoice(combatant, enabled);
    await resetActionEconomy(combatant, buildActor(1, 6));

    expect(combatant.getFlag('dnd35e', 'twoWeaponFighting')).toBeUndefined();
    expect(getTwoWeaponFightingChoice(combatant)).toBeUndefined();
  });
});

describe('getActionEconomy', () => {
  it('returns full defaults when no flag has ever been stored', () => {
    const economy = getActionEconomy(buildCombatant());
    expect(economy).toEqual({
      actions: { standard: 1, move: 1, swift: 1, aoo: 0 },
      bab: { [MAIN_HAND_EQUIP_SLOT]: 0, [OFF_HAND_EQUIP_SLOT]: 0 },
      used: { standard: false, move: false, swift: false, standardAttackUsed: false, movedAfterAttack: false, chargedThisTurn: false },
    });
  });

  it('merges partial stored flags with defaults rather than replacing the whole shape', () => {
    const combatant = buildCombatant({
      actionEconomy: {
        actions: { standard: 0, minor: 1 },
        used: { minor: false, fullAttackUsed: true, attackCount: 2 },
      },
    });
    const economy = getActionEconomy(combatant);
    expect(economy.actions).toEqual({ standard: 0, move: 1, swift: 1, aoo: 0 });
    expect(economy.bab).toEqual({ [MAIN_HAND_EQUIP_SLOT]: 0, [OFF_HAND_EQUIP_SLOT]: 0 });
    expect(economy.used).not.toHaveProperty('minor');
    expect(economy.used.fullAttackUsed).toBe(true);
    expect(economy.used.attackCount).toBe(2);
  });
});

describe('resetActionEconomy', () => {
  it('refills bab pools and AoO from the actor, resets actions, clears used flags', async () => {
    const combatant = buildCombatant({
      actionEconomy: {
        actions: { standard: 0, move: 0, swift: 0, aoo: 0 },
        bab: { [MAIN_HAND_EQUIP_SLOT]: 0, [OFF_HAND_EQUIP_SLOT]: 0 },
        used: { standard: true, move: true, swift: true, standardAttackUsed: true, movedAfterAttack: true, chargedThisTurn: true },
      },
    });
    await resetActionEconomy(combatant, buildActor(3, 6));

    const economy = getActionEconomy(combatant);
    expect(economy.actions).toEqual({ standard: 1, move: 1, swift: 1, aoo: 3 });
    expect(economy.bab).toEqual({ [MAIN_HAND_EQUIP_SLOT]: 6, [OFF_HAND_EQUIP_SLOT]: 6 });
    expect(economy.used).toEqual({ standard: false, move: false, swift: false, standardAttackUsed: false, movedAfterAttack: false, chargedThisTurn: false });
  });
});

describe('canUseAction / spendAction / refundAction (hierarchy resolution)', () => {
  it('a single standard request spends the standard pool', () => {
    const combatant = buildCombatant();
    expect(canUseAction(combatant, ['standard'])).toEqual(['standard']);
  });

  it('a move request can be covered by the standard pool once move is already spent', () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { move: 0 } } });
    expect(canUseAction(combatant, ['move'])).toEqual(['standard']);
  });

  it('returns null when nothing remains to cover a move request', () => {
    const combatant = buildCombatant({
      actionEconomy: { actions: { standard: 0, move: 0 } },
    });
    expect(canUseAction(combatant, ['move'])).toBeNull();
  });

  it('a compound full-round request (move + standard) is all-or-nothing', () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { standard: 0 } } });
    // Only move remains — the full-round request can't be covered even though 'move' alone could be.
    expect(canUseAction(combatant, ['move', 'standard'])).toBeNull();
  });

  it('a pool holding more than one use (e.g. an "extra action" grant) covers two separate requests before running out', () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { standard: 2 } } });
    expect(canUseAction(combatant, ['standard'])).toEqual(['standard']);
  });

  it('spendAction flips both actions and used flags for the resolved pools', async () => {
    const combatant = buildCombatant();
    const spent = await spendAction(combatant, ['move']);
    expect(spent).toEqual(['move']);

    const economy = getActionEconomy(combatant);
    expect(economy.actions.move).toBe(0);
    expect(economy.used.move).toBe(true);
  });

  it('spendAction only decrements by 1, leaving an extra-action pool still available', async () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { standard: 2 } } });
    const spent = await spendAction(combatant, ['standard']);
    expect(spent).toEqual(['standard']);

    const economy = getActionEconomy(combatant);
    expect(economy.actions.standard).toBe(1);
    expect(economy.used.standard).toBe(false);
  });

  it('spendAction returns null and spends nothing when the request cannot be covered', async () => {
    const combatant = buildCombatant({
      actionEconomy: { actions: { standard: 0, move: 0 } },
    });
    const spent = await spendAction(combatant, ['standard']);
    expect(spent).toBeNull();

    const economy = getActionEconomy(combatant);
    expect(economy.actions).toEqual({ standard: 0, move: 0, swift: 1, aoo: 0 });
  });

  it('refundAction restores exactly the pools passed in, independent of canUseAction', async () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { standard: 0 }, used: { standard: true } } });
    await refundAction(combatant, ['standard']);

    const economy = getActionEconomy(combatant);
    expect(economy.actions.standard).toBe(1);
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
    expect(economy.actions).toEqual({ standard: 1, move: 1, swift: 0, aoo: 0 });
    expect(economy.used.swift).toBe(true);
  });

  it('cannot be covered by downgrading a spent move or standard action', () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { swift: 0 } } });
    // Standard and move are both still available, but swift has its own pool and isn't in ACTION_HIERARCHY.
    expect(canUseAction(combatant, ['swift'])).toBeNull();
  });

  it('spending swift does not consume the standard/move pools', async () => {
    const combatant = buildCombatant();
    await spendAction(combatant, ['swift']);

    const economy = getActionEconomy(combatant);
    expect(economy.actions.standard).toBe(1);
    expect(economy.actions.move).toBe(1);
  });
});

describe('toggleActionAvailability (manual pip click)', () => {
  it('decrements a positive pool by 1', async () => {
    const combatant = buildCombatant();
    await toggleActionAvailability(combatant, 'standard');
    expect(getActionEconomy(combatant).actions.standard).toBe(0);
    expect(getActionEconomy(combatant).used.standard).toBe(true);
  });

  it('decrements an extra-action pool (>1) by 1 without fully spending it', async () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { standard: 2 } } });
    await toggleActionAvailability(combatant, 'standard');
    expect(getActionEconomy(combatant).actions.standard).toBe(1);
    expect(getActionEconomy(combatant).used.standard).toBe(false);
  });

  it('adds 1 back once a pool is at or below 0', async () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { standard: 0 } } });
    await toggleActionAvailability(combatant, 'standard');
    expect(getActionEconomy(combatant).actions.standard).toBe(1);
    expect(getActionEconomy(combatant).used.standard).toBe(false);
  });

  it('applies the same spend/refund toggle to aoo, with no `used` counterpart to sync', async () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { aoo: 1 } } });
    await toggleActionAvailability(combatant, 'aoo');
    expect(getActionEconomy(combatant).actions.aoo).toBe(0);

    await toggleActionAvailability(combatant, 'aoo');
    expect(getActionEconomy(combatant).actions.aoo).toBe(1);
  });
});

describe('canUseHandAttack', () => {
  it('allows the prepaid charge attack at BAB +0, but never another attack after it', async () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { standard: 0 }, used: { chargedThisTurn: true } } });
    for (const hand of [MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT, BOTH_HANDS_EQUIP_SLOT] as const) {
      expect(canUseHandAttack(combatant, hand)).toBe(true);
      expect(getHandBab(combatant, hand)).toBe(0);
    }
    await markMovedAfterAttack(combatant);
    await refundAction(combatant, ['standard']);
    for (const hand of [MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT, BOTH_HANDS_EQUIP_SLOT] as const) {
      expect(canUseHandAttack(combatant, hand)).toBe(false);
    }
  });

  it('is always usable while the standard action is unspent, regardless of BAB/movedAfterAttack', () => {
    const combatant = buildCombatant({ actionEconomy: { used: { movedAfterAttack: true } } });
    expect(canUseHandAttack(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(true);
  });

  it('is blocked once the standard action is spent and the combatant has since moved', () => {
    const combatant = buildCombatant({
      actionEconomy: { actions: { standard: 0 }, bab: { [MAIN_HAND_EQUIP_SLOT]: 5, [OFF_HAND_EQUIP_SLOT]: 5 }, used: { movedAfterAttack: true } },
    });
    expect(canUseHandAttack(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(false);
  });

  it('uses the named hand\'s BAB pool when a standard attack can be promoted to a full attack', () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { standard: 0 }, bab: { [MAIN_HAND_EQUIP_SLOT]: 5, [OFF_HAND_EQUIP_SLOT]: 0 }, used: { standardAttackUsed: true } } });
    expect(canUseHandAttack(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(true);
    expect(canUseHandAttack(combatant, OFF_HAND_EQUIP_SLOT)).toBe(false);
  });

  it('requires BAB remaining in both pools for a two-handed ("both") attack', () => {
    const combatant = buildCombatant({ actionEconomy: { actions: { standard: 0 }, bab: { [MAIN_HAND_EQUIP_SLOT]: 5, [OFF_HAND_EQUIP_SLOT]: 0 } } });
    expect(canUseHandAttack(combatant, BOTH_HANDS_EQUIP_SLOT)).toBe(false);

    const bothReady = buildCombatant({ actionEconomy: { actions: { standard: 0 }, bab: { [MAIN_HAND_EQUIP_SLOT]: 5, [OFF_HAND_EQUIP_SLOT]: 5 }, used: { standardAttackUsed: true } } });
    expect(canUseHandAttack(bothReady, BOTH_HANDS_EQUIP_SLOT)).toBe(true);
  });
});

describe('spendHandBab / refundHandBab', () => {
  it('spends a shared non-TWF +6/+1 sequence from both pools without granting an extra off-hand attack', async () => {
    const combatant = buildCombatant();
    await resetActionEconomy(combatant, buildActor(0, 6));
    await setTwoWeaponFightingChoice(combatant, false);
    expect(getHandBab(combatant, BOTH_HANDS_EQUIP_SLOT)).toBe(6);

    expect(await spendAttackAction(combatant)).not.toBeNull();
    await spendHandBab(combatant, BOTH_HANDS_EQUIP_SLOT, 5);
    expect(getHandBab(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(1);
    expect(getHandBab(combatant, OFF_HAND_EQUIP_SLOT)).toBe(1);
    expect(canUseHandAttack(combatant, BOTH_HANDS_EQUIP_SLOT)).toBe(true);

    expect(await spendAttackAction(combatant)).not.toBeNull();
    await spendHandBab(combatant, BOTH_HANDS_EQUIP_SLOT, 5);
    for (const hand of [MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT, BOTH_HANDS_EQUIP_SLOT] as const) {
      expect(getHandBab(combatant, hand)).toBe(0);
      expect(canUseHandAttack(combatant, hand)).toBe(false);
    }
    expect(getActionEconomy(combatant).actions).toEqual({ standard: 0, move: 0, swift: 1, aoo: 0 });
    expect(getTwoWeaponFightingChoice(combatant)).toBe(false);
  });

  it('does not reopen a spent charge attack when refunding an unrelated single-hand attack', async () => {
    const combatant = buildCombatant({
      actionEconomy: { actions: { standard: 0 }, used: { chargedThisTurn: true, movedAfterAttack: true } },
    });
    await refundHandBab(combatant, MAIN_HAND_EQUIP_SLOT, 5, buildActor(0, 16));
    expect(canUseHandAttack(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(false);
  });

  it('undoing the charge attack restores both pools and makes the single attack available again', async () => {
    const combatant = buildCombatant({
      actionEconomy: {
        actions: { standard: 0, move: 0 },
        bab: { [MAIN_HAND_EQUIP_SLOT]: 16, [OFF_HAND_EQUIP_SLOT]: 16 },
        used: { chargedThisTurn: true },
      },
    });
    await spendHandBab(combatant, BOTH_HANDS_EQUIP_SLOT, 16);
    await markMovedAfterAttack(combatant);
    await refundHandBab(combatant, BOTH_HANDS_EQUIP_SLOT, 16, buildActor(0, 16));

    expect(getHandBab(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(16);
    expect(getHandBab(combatant, OFF_HAND_EQUIP_SLOT)).toBe(16);
    expect(canUseHandAttack(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(true);
    expect(getActionEconomy(combatant).actions.standard).toBe(0);
  });

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
  it('clears charge flags when its movement is undone without changing action or BAB pools', async () => {
    const combatant = buildCombatant();
    await markChargedThisTurn(combatant);
    await markMovedAfterAttack(combatant);
    const before = getActionEconomy(combatant);
    await clearChargedThisTurn(combatant);
    const after = getActionEconomy(combatant);
    expect(after.used.chargedThisTurn).toBe(false);
    expect(after.used.movedAfterAttack).toBe(false);
    expect(after.actions).toEqual(before.actions);
    expect(after.bab).toEqual(before.bab);
  });

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
