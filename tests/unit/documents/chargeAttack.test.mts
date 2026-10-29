import type { Creature } from '@actors/creature/index.mjs';
import { CHARGED_CONDITION_ID } from '@constants/conditions.mjs';
import { BOTH_HANDS_EQUIP_SLOT, MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT } from '@constants/equipmentSlots.mjs';
import { canUseHandAttack, getActionEconomy, getHandBab, markChargedThisTurn, refundAction, resetActionEconomy, spendAction } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { getWeaponActionChoices } from '@documents/token/hud/tokenHudActions.mjs';
import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
import { WEAPON_ACTION_TYPE } from '@items/baseItem/actions/constants.mjs';
import { createMeleeCombatModifiers } from '@items/physical/weapon/actions/WeaponAttack/combatModifiers.mjs';
import type { UseWeaponAttackContext, WeaponAttackActionResult } from '@items/physical/weapon/actions/WeaponAttack/types.mjs';
import { WeaponAttackDataModel } from '@items/physical/weapon/actions/WeaponAttack/WeaponAttackDataModel.mjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@items/baseItem/actions/logic/actionParticipant.mjs', () => ({
  participantToken: (participant: TokenDnd35e) => participant,
  participantActor: (participant: TokenDnd35e) => participant.actor,
}));

class TestWeaponAttack extends WeaponAttackDataModel {
  async postExecute(context: UseWeaponAttackContext, result: WeaponAttackActionResult): Promise<void> {
    await this._postExecute(context, result);
  }
}

const buildCharge = async (bab: number) => {
  const actor = { system: { bab, aooCount: 1 }, items: [], statuses: new Set([CHARGED_CONDITION_ID]) } as unknown as Creature;
  const flags: Record<string, unknown> = {};
  const combatant = {
    combat: { started: true },
    initiative: 10,
    getFlag: (_scope: string, key: string) => flags[key],
    setFlag: async (_scope: string, key: string, value: unknown) => { flags[key] = value; },
  } as unknown as CombatantDnd35e;
  const token = { id: 'attacker', actor } as unknown as TokenDnd35e;
  vi.stubGlobal('game', {
    ...game,
    combat: { started: true, getCombatantsByToken: () => [combatant] },
  });
  await resetActionEconomy(combatant, actor);
  await spendAction(combatant, ['move', 'standard']);
  await markChargedThisTurn(combatant);
  return { combatant, token };
};

afterEach(() => vi.unstubAllGlobals());

describe('charge attack spending', () => {
  it('promotes the second ordinary weapon attack to a full attack in post-execution', async () => {
    const { combatant, token } = await buildCharge(11);
    await resetActionEconomy(combatant, token.actor as Creature);
    const action = new TestWeaponAttack();
    await action.postExecute(
      { actor: token, wieldedHand: MAIN_HAND_EQUIP_SLOT, isFree: false } as UseWeaponAttackContext,
      { cancelled: false, reason: '', warnings: [] }
    );
    expect(getActionEconomy(combatant).actions).toMatchObject({ standard: 0, move: 1 });
    const attackMessage = { update: vi.fn() } as unknown as ChatMessage;
    await action.postExecute(
      { actor: token, wieldedHand: OFF_HAND_EQUIP_SLOT, isFree: false } as UseWeaponAttackContext,
      { cancelled: false, reason: '', warnings: [], attackMessage }
    );
    expect(getActionEconomy(combatant)).toMatchObject({
      actions: { standard: 0, move: 0 },
      used: { standardAttackUsed: true, fullAttackUsed: true, attackCount: 2 },
    });
    expect(attackMessage.update).toHaveBeenCalledWith({
      'flags.dnd35e.attackCard.actionEconomySpent': {
        standardActionSpent: false, moveActionSpent: true, attackSequence: true, hand: BOTH_HANDS_EQUIP_SLOT, babSpent: 5,
      },
    });
  });

  it('does not spend an extra granted standard action on the prepaid charge attack', async () => {
    const { combatant, token } = await buildCharge(16);
    await refundAction(combatant, ['standard']);
    await new TestWeaponAttack().postExecute(
      { actor: token, wieldedHand: MAIN_HAND_EQUIP_SLOT, isFree: false } as UseWeaponAttackContext,
      { cancelled: false, reason: '', warnings: [] }
    );
    expect(getActionEconomy(combatant).actions.standard).toBe(1);
    expect(canUseHandAttack(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(false);
  });

  it('spends only five BAB from the selected hand when opting into TWF', async () => {
    const { combatant, token } = await buildCharge(16);
    await resetActionEconomy(combatant, token.actor as Creature);
    const attackMessage = { update: vi.fn() } as unknown as ChatMessage;
    await new TestWeaponAttack().postExecute(
      { actor: token, wieldedHand: MAIN_HAND_EQUIP_SLOT, isFree: false } as UseWeaponAttackContext,
      { cancelled: false, reason: '', warnings: [], attackMessage, twoWeaponFighting: true }
    );
    expect(getHandBab(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(11);
    expect(getHandBab(combatant, OFF_HAND_EQUIP_SLOT)).toBe(16);
    expect(attackMessage.update).toHaveBeenCalledWith({
      'flags.dnd35e.attackCard.actionEconomySpent': { standardActionSpent: true, attackSequence: true, hand: MAIN_HAND_EQUIP_SLOT, babSpent: 5 },
    });
  });

  it('shares the +6/+1 sequence between hands without TWF and records shared refunds', async () => {
    const { combatant, token } = await buildCharge(6);
    await resetActionEconomy(combatant, token.actor as Creature);
    const action = new TestWeaponAttack();
    const attackMessage = { update: vi.fn() } as unknown as ChatMessage;
    await action.postExecute(
        { actor: token, wieldedHand: MAIN_HAND_EQUIP_SLOT, isFree: false } as UseWeaponAttackContext,
        { cancelled: false, reason: '', warnings: [], twoWeaponFighting: false, attackMessage }
    );
    expect(getHandBab(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(1);
    expect(getHandBab(combatant, OFF_HAND_EQUIP_SLOT)).toBe(1);
    await action.postExecute(
        { actor: token, wieldedHand: OFF_HAND_EQUIP_SLOT, isFree: false } as UseWeaponAttackContext,
        { cancelled: false, reason: '', warnings: [], twoWeaponFighting: false, attackMessage }
    );
    expect(canUseHandAttack(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(false);
    expect(canUseHandAttack(combatant, OFF_HAND_EQUIP_SLOT)).toBe(false);
    expect(attackMessage.update).toHaveBeenLastCalledWith({
      'flags.dnd35e.attackCard.actionEconomySpent': {
        standardActionSpent: false, moveActionSpent: true, attackSequence: true, hand: BOTH_HANDS_EQUIP_SLOT, babSpent: 5,
      },
    });
  });

  it.each([false, true])('preserves nonlethal choice and penalty direction for default=%s', async (nonlethalDefault) => {
    const { token } = await buildCharge(6);
    const toggle = createMeleeCombatModifiers(token, undefined, nonlethalDefault, false).find(mod => mod.id === 'nonLethal')!;
    expect(toggle.createRollModifiers(nonlethalDefault, MAIN_HAND_EQUIP_SLOT).attackModifiers).toEqual([]);
    expect(toggle.createRollModifiers(!nonlethalDefault, MAIN_HAND_EQUIP_SLOT).attackModifiers).toEqual([
      expect.objectContaining({
        value: -4,
        label: nonlethalDefault ? 'dnd35e.COMBAT.CombatModifiers.Lethal.Label' : 'dnd35e.COMBAT.CombatModifiers.NonLethal.Label',
      }),
    ]);
    const noPenalty = createMeleeCombatModifiers(token, undefined, nonlethalDefault, true).find(mod => mod.id === 'nonLethal')!;
    expect(noPenalty.createRollModifiers(!nonlethalDefault, MAIN_HAND_EQUIP_SLOT).attackModifiers).toEqual([]);
  });

  it.each([MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT, BOTH_HANDS_EQUIP_SLOT] as const)('spends both BAB pools after one %s attack at top BAB', async (hand) => {
    const { combatant, token } = await buildCharge(16);
    const action = new TestWeaponAttack();
    const context = { actor: token, wieldedHand: hand, isFree: false } as UseWeaponAttackContext;
    const attackMessage = { update: vi.fn() } as unknown as ChatMessage;

    expect(getHandBab(combatant, hand)).toBe(16);
    await action.postExecute(context, { cancelled: false, reason: '', warnings: [], finalHand: hand, attackMessage });

    for (const otherHand of [MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT, BOTH_HANDS_EQUIP_SLOT] as const) {
      expect(getHandBab(combatant, otherHand)).toBe(0);
      expect(canUseHandAttack(combatant, otherHand)).toBe(false);
    }
    expect(attackMessage.update).toHaveBeenCalledWith({
      'flags.dnd35e.attackCard.actionEconomySpent': { standardActionSpent: false, hand: BOTH_HANDS_EQUIP_SLOT, babSpent: 16 },
    });
  });

  it.each([{ cancelled: true, isFree: false }, { cancelled: false, isFree: true }])('does not consume the charge attack when %j', async ({ cancelled, isFree }) => {
    const { combatant, token } = await buildCharge(11);
    const action = new TestWeaponAttack();
    await action.postExecute(
      { actor: token, wieldedHand: MAIN_HAND_EQUIP_SLOT, isFree } as UseWeaponAttackContext,
      { cancelled, reason: '', warnings: [] }
    );
    expect(getHandBab(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(11);
    expect(getHandBab(combatant, OFF_HAND_EQUIP_SLOT)).toBe(11);
    expect(getActionEconomy(combatant).used.movedAfterAttack).toBe(false);
  });

  it('detects the charged condition in the melee dialog even without the movement flag', async () => {
    const { combatant, token } = await buildCharge(6);
    await resetActionEconomy(combatant, token.actor as Creature);
    const charge = createMeleeCombatModifiers(token, undefined, false).find(mod => mod.id === 'charge')!;
    expect(charge).toMatchObject({ checked: true, wasAutoDetected: true });
    expect(charge.createRollModifiers(charge.checked, MAIN_HAND_EQUIP_SLOT).attackModifiers).toEqual([
      expect.objectContaining({ id: 'charge', value: 2 }),
    ]);
  });

  it('shows BAB 0 and disables every HUD weapon action after the charge attack', async () => {
    const { combatant, token } = await buildCharge(16);
    const weapons = [MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT].map((hand) => ({
      id: hand,
      uuid: `Item.${hand}`,
      type: 'weapon',
      name: hand,
      system: {
        isCarried: true,
        isEquipped: true,
        equippedSlotIds: [hand],
        actions: [{ _id: hand, type: WEAPON_ACTION_TYPE.MELEE, isTopLevel: true, name: { resolvedValue: hand } }],
      },
    }));
    Object.assign(token.actor!.system, {
      actions: weapons.map((weapon) => ({ type: WEAPON_ACTION_TYPE.MELEE, itemUuid: weapon.uuid, id: weapon.id })),
    });
    Object.assign(token.actor!, { items: weapons });
    vi.stubGlobal('fromUuid', async (uuid: string) => weapons.find((weapon) => weapon.uuid === uuid));

    expect(await getWeaponActionChoices(token.actor as Creature, token)).toEqual([
      expect.objectContaining({ label: `${MAIN_HAND_EQUIP_SLOT} (16)`, enabled: true }),
      expect.objectContaining({ label: `${OFF_HAND_EQUIP_SLOT} (16)`, enabled: true }),
    ]);

    await new TestWeaponAttack().postExecute(
      { actor: token, wieldedHand: MAIN_HAND_EQUIP_SLOT, isFree: false } as UseWeaponAttackContext,
      { cancelled: false, reason: '', warnings: [] }
    );

    expect(await getWeaponActionChoices(token.actor as Creature, token)).toEqual([
      expect.objectContaining({ label: `${MAIN_HAND_EQUIP_SLOT} (0)`, enabled: false }),
      expect.objectContaining({ label: `${OFF_HAND_EQUIP_SLOT} (0)`, enabled: false }),
    ]);
    expect(getActionEconomy(combatant).bab).toEqual({ [MAIN_HAND_EQUIP_SLOT]: 0, [OFF_HAND_EQUIP_SLOT]: 0 });
  });
});
