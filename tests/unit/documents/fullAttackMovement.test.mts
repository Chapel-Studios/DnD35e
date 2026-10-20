import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { Creature } from '@actors/creature/index.mjs';
import type { TokenMovementOperation } from '@client/documents/_types.mjs';
import type { DatabaseUpdateOperation } from '@common/abstract/_types.mjs';
import { MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT, type WieldedHand } from '@constants/equipmentSlots.mjs';
import { canUseHandAttack, getActionEconomy, refundAttackAction, resetActionEconomy, spendAction, spendAttackAction, spendHandBab } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { getMovementSession } from '@documents/combat/combatant/movementSession.mjs';
import type { SceneDnd35e } from '@scene/SceneDnd35e.mjs';
import { TokenDocumentDnd35e } from '@scene/tokenDocument/TokenDocumentDnd35e.mjs';
import { upsertMoveActionCard } from '@source/dice/index.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@settings/index.mjs', () => ({
  useSettingsStore: () => ({
    measurement: { convertToLocalizedDistance: (value: number) => value * 5 },
  }),
}));

vi.mock('@source/dice/index.mjs', () => ({
  buildMoveActionCard: vi.fn().mockResolvedValue('full-round-card'),
  buildMoveActionCardContent: vi.fn(),
  upsertMoveActionCard: vi.fn().mockResolvedValue('movement-card'),
}));

class TestTokenDocument extends TokenDocumentDnd35e {
  completeMovement(action: string, cost: number, isUndo = false): void {
    const operation: Partial<DatabaseUpdateOperation<SceneDnd35e | null>> & { isUndo: boolean } = { isUndo };
    this._onUpdateMovement({
      id: 'movement',
      origin: { x: 0, y: 0, elevation: 0 },
      passed: { cost, waypoints: [{ action }] },
    } as unknown as DeepReadonly<TokenMovementOperation>, operation, {} as User);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(TokenDocument.prototype, '_onUpdateMovement', { configurable: true, value: vi.fn() });
});

afterEach(() => {
  Reflect.deleteProperty(TokenDocument.prototype, '_onUpdateMovement');
  vi.unstubAllGlobals();
});

async function buildTurn(bab = 11) {
  const actor = { system: { bab, aooCount: 1, speed: { land: 6 } } } as unknown as Creature;
  const flags: Record<string, unknown> = {};
  const combatant = {
    getFlag: (_scope: string, key: string) => flags[key],
    setFlag: async (_scope: string, key: string, value: unknown) => { flags[key] = value; },
  } as unknown as CombatantDnd35e;
  const token = new TestTokenDocument();
  Object.assign(token, { id: 'attacker', actor: actor as ActorDnd35e, movementHistory: [] });
  vi.stubGlobal('game', { ...game, combat: { started: true, getCombatantsByToken: () => [combatant] } });
  await resetActionEconomy(combatant, actor);

  async function move(cost: number, action = 'walk') {
    const expectedCost = getMovementSession(combatant).cumulativeCost + cost;
    token.completeMovement(action, cost);
    await vi.waitFor(() => expect(getMovementSession(combatant).cumulativeCost).toBe(expectedCost));
  }

  async function attack(hand: WieldedHand = MAIN_HAND_EQUIP_SLOT) {
    expect(canUseHandAttack(combatant, hand)).toBe(true);
    const spent = await spendAttackAction(combatant);
    expect(spent).not.toBeNull();
    await spendHandBab(combatant, hand, 5);
    return spent!;
  }

  return { actor, combatant, token, move, attack };
}

describe('automatic five-foot steps', () => {
  it('reserves the move action for an ordinary 5-foot walk without provoking', async () => {
    const { combatant, move } = await buildTurn();
    await move(5);
    expect(getMovementSession(combatant)).toMatchObject({ category: 'step', spentTiers: ['move'] });
    expect(getActionEconomy(combatant).actions).toMatchObject({ move: 0, standard: 1 });
    expect(upsertMoveActionCard).toHaveBeenLastCalledWith(combatant, expect.anything(), 'fiveFootStep',
      expect.objectContaining({ provokes: false, budget: 5, cost: 5 }), expect.anything(), null);
  });

  it('upgrades additional walking to normal movement and removes protection for the initial step', async () => {
    const { combatant, move } = await buildTurn();
    await move(5);
    await move(5);
    expect(getMovementSession(combatant)).toMatchObject({ category: 'normal', spentTiers: ['move'], stepProtectionLost: true });
    expect(getActionEconomy(combatant).actions).toMatchObject({ move: 0, standard: 1 });
    expect(upsertMoveActionCard).toHaveBeenLastCalledWith(combatant, expect.anything(), 'walk',
      expect.objectContaining({ provokes: true, stepProtectionLost: true, overBudget: false }), expect.anything(), 'movement-card');
    await move(25);
    expect(getActionEconomy(combatant).actions).toMatchObject({ move: 0, standard: 0 });
    expect(upsertMoveActionCard).toHaveBeenLastCalledWith(combatant, expect.anything(), 'doubleMove',
      expect.objectContaining({ provokes: true, stepProtectionLost: true, budget: 60 }), expect.anything(), 'movement-card');
  });

  it('does not extend the explicit five-foot-step mode', async () => {
    const { move } = await buildTurn();
    await move(5, 'fiveFootStep');
    await move(5, 'fiveFootStep');
    expect(upsertMoveActionCard).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), 'fiveFootStep',
      expect.objectContaining({ overBudget: true, overBudgetReason: 'fiveFootStep', budget: 5 }), expect.anything(), 'movement-card');
  });

  it('does not classify crawling as a protected step', async () => {
    const { combatant, move } = await buildTurn();
    await move(5, 'crawl');
    expect(getMovementSession(combatant).category).toBe('normal');
    expect(upsertMoveActionCard).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), 'crawl',
      expect.objectContaining({ provokes: true }), expect.anything(), null);
  });

  it('reclassifies a native Undo back to 5 feet as a protected step', async () => {
    const { combatant, token, move } = await buildTurn();
    await move(10);
    Object.assign(token, { movementHistory: [{ action: 'walk', cost: 5 }] });
    token.completeMovement('walk', 0, true);
    await vi.waitFor(() => expect(getMovementSession(combatant).cumulativeCost).toBe(5));
    expect(getMovementSession(combatant)).toMatchObject({ category: 'step', stepProtectionLost: false, spentTiers: ['move'] });
  });
});

describe('full attack promotion', () => {
  it('spends standard on the first attack, move on the second, and nothing on later iteratives', async () => {
    const { combatant, attack } = await buildTurn(16);
    const first = await attack();
    expect(first).toMatchObject({ standardActionSpent: true });
    expect(getActionEconomy(combatant).actions).toMatchObject({ standard: 0, move: 1 });
    const second = await attack();
    expect(second).toMatchObject({ standardActionSpent: false, moveActionSpent: true });
    expect(getActionEconomy(combatant).used.fullAttackUsed).toBe(true);
    expect(getActionEconomy(combatant).actions).toMatchObject({ standard: 0, move: 0 });
    expect(await attack()).toEqual({ standardActionSpent: false, attackSequence: true });
    expect(getActionEconomy(combatant).bab[MAIN_HAND_EQUIP_SLOT]).toBe(1);
  });

  it('requires full attack promotion even for the other hand at BAB +1', async () => {
    const { combatant, attack } = await buildTurn(1);
    await attack();
    expect(getActionEconomy(combatant).bab).toEqual({ [MAIN_HAND_EQUIP_SLOT]: 0, [OFF_HAND_EQUIP_SLOT]: 1 });
    await attack(OFF_HAND_EQUIP_SLOT);
    expect(getActionEconomy(combatant).actions).toMatchObject({ standard: 0, move: 0 });
    expect(getActionEconomy(combatant).used.fullAttackUsed).toBe(true);
  });

  it('cannot promote after ordinary movement or a non-movement move-action spend', async () => {
    const turn = await buildTurn();
    await turn.move(10);
    await turn.attack();
    expect(canUseHandAttack(turn.combatant, MAIN_HAND_EQUIP_SLOT)).toBe(false);
    expect(canUseHandAttack(turn.combatant, OFF_HAND_EQUIP_SLOT)).toBe(false);
    expect(await spendAttackAction(turn.combatant)).toBeNull();

    const other = await buildTurn();
    await spendAction(other.combatant, ['move']);
    await other.attack();
    expect(canUseHandAttack(other.combatant, OFF_HAND_EQUIP_SLOT)).toBe(false);
  });

  it.each(['walk', 'fiveFootStep'])('reassigns a %s step reservation to the full attack', async (action) => {
    const { combatant, move, attack } = await buildTurn();
    await move(5, action);
    await attack();
    const second = await attack(OFF_HAND_EQUIP_SLOT);
    expect(second).toMatchObject({ moveActionSpent: true, attackSequence: true });
    expect(getMovementSession(combatant)).toMatchObject({ category: 'step', spentTiers: [] });
    expect(getActionEconomy(combatant).actions).toMatchObject({ standard: 0, move: 0 });
    await refundAttackAction(combatant, second);
    expect(getMovementSession(combatant).spentTiers).toEqual(['move']);
    expect(getActionEconomy(combatant).used.fullAttackUsed).toBe(false);
    expect(getActionEconomy(combatant).actions.move).toBe(0);
  });

  it('allows one protected step after a full attack, but flags extending it as unaffordable', async () => {
    const { combatant, move, attack } = await buildTurn();
    await attack();
    const second = await attack(OFF_HAND_EQUIP_SLOT);
    await move(5);
    expect(getMovementSession(combatant)).toMatchObject({ category: 'step', spentTiers: [] });
    expect(upsertMoveActionCard).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), 'fiveFootStep',
      expect.objectContaining({ provokes: false, overBudget: false }), expect.anything(), null);
    await refundAttackAction(combatant, second);
    expect(getMovementSession(combatant).spentTiers).toEqual(['move']);
    expect(getActionEconomy(combatant).actions.move).toBe(0);
    await attack(OFF_HAND_EQUIP_SLOT);
    await move(5);
    expect(upsertMoveActionCard).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), 'walk',
      expect.objectContaining({ overBudget: true, overBudgetReason: 'insufficientActions', provokes: true, stepProtectionLost: true }),
      expect.anything(), 'movement-card');
  });

  it('native Undo of a step after a full attack does not refund its move action', async () => {
    const { combatant, token, move, attack } = await buildTurn();
    await attack();
    await attack(OFF_HAND_EQUIP_SLOT);
    await move(5);
    token.completeMovement('walk', 0, true);
    await vi.waitFor(() => expect(getMovementSession(combatant).category).toBeNull());
    expect(getActionEconomy(combatant).actions).toMatchObject({ standard: 0, move: 0 });
  });

  it('does not unlock BAB-funded attacks after spending standard on something else', async () => {
    const { combatant } = await buildTurn();
    await spendAction(combatant, ['standard']);
    expect(canUseHandAttack(combatant, MAIN_HAND_EQUIP_SLOT)).toBe(false);
    expect(await spendAttackAction(combatant)).toBeNull();
  });

  it('refunds sequence costs correctly even when an earlier attack is undone first', async () => {
    const { combatant, attack } = await buildTurn(16);
    const first = await attack();
    const second = await attack(OFF_HAND_EQUIP_SLOT);
    const third = await attack();
    await refundAttackAction(combatant, first);
    expect(getActionEconomy(combatant)).toMatchObject({
      actions: { standard: 0, move: 0 }, used: { attackCount: 2, fullAttackUsed: true },
    });
    await refundAttackAction(combatant, second);
    expect(getActionEconomy(combatant)).toMatchObject({
      actions: { standard: 0, move: 1 }, used: { attackCount: 1, fullAttackUsed: false },
    });
    await refundAttackAction(combatant, third);
    expect(getActionEconomy(combatant)).toMatchObject({
      actions: { standard: 1, move: 1 }, used: { attackCount: 0, standardAttackUsed: false },
    });
  });

  it('refunds the move after undoing the step before undoing the promoted attack', async () => {
    const { combatant, token, move, attack } = await buildTurn();
    await move(5);
    await attack();
    const second = await attack(OFF_HAND_EQUIP_SLOT);
    token.completeMovement('walk', 0, true);
    await vi.waitFor(() => expect(getMovementSession(combatant).category).toBeNull());
    await refundAttackAction(combatant, second);
    expect(getActionEconomy(combatant).actions).toMatchObject({ standard: 0, move: 1 });
  });
});
