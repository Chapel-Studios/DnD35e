import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { TokenMovementOperation } from '@client/documents/_types.mjs';
import type { DatabaseUpdateOperation } from '@common/abstract/_types.mjs';
import { CHARGED_CONDITION_ID } from '@constants/conditions.mjs';
import { getActionEconomy } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { SceneDnd35e } from '@scene/SceneDnd35e.mjs';
import { TokenDocumentDnd35e } from '@scene/tokenDocument/TokenDocumentDnd35e.mjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@settings/index.mjs', () => ({
  useSettingsStore: () => ({
    measurement: { convertToLocalizedDistance: (value: number) => value },
  }),
}));

vi.mock('@documents/token/logic/reach.mjs', () => ({
  isWithinReach: () => true,
}));

vi.mock('@source/dice/index.mjs', () => ({
  buildMoveActionCard: vi.fn().mockResolvedValue('move-card'),
  buildMoveActionCardContent: vi.fn(),
  upsertMoveActionCard: vi.fn(),
}));

class TestTokenDocument extends TokenDocumentDnd35e {
  completeMovement(action: string, isUndo = false): void {
    const operation: Partial<DatabaseUpdateOperation<SceneDnd35e | null>> & { isUndo: boolean } = { isUndo };
    this._onUpdateMovement({
      id: 'movement',
      origin: { x: 0, y: 0, elevation: 0 },
      passed: { cost: 6, waypoints: [{ action }] },
    } as unknown as DeepReadonly<TokenMovementOperation>, operation, {} as User);
  }
}

beforeEach(() => {
  Object.defineProperty(TokenDocument.prototype, '_onUpdateMovement', { configurable: true, value: vi.fn() });
});

afterEach(() => {
  Reflect.deleteProperty(TokenDocument.prototype, '_onUpdateMovement');
  vi.unstubAllGlobals();
});

const buildMovement = (standard = 1) => {
  const toggleStatusEffect = vi.fn().mockResolvedValue(undefined);
  const actor = {
    system: { size: 'medium', speed: { land: 6 } },
    toggleStatusEffect,
  } as unknown as ActorDnd35e;
  const flags: Record<string, unknown> = { actionEconomy: { actions: { standard } } };
  const combatant = {
    getFlag: (_scope: string, key: string) => flags[key],
    setFlag: async (_scope: string, key: string, value: unknown) => { flags[key] = value; },
  } as unknown as CombatantDnd35e;
  const token = new TestTokenDocument();
  Object.assign(token, { id: 'attacker', actor, disposition: 1, object: {}, movementHistory: [] });
  vi.stubGlobal('game', {
    ...game,
    combat: { started: true, getCombatantsByToken: () => [combatant] },
  });
  vi.stubGlobal('canvas', { tokens: { placeables: [{ actor: {}, document: { disposition: -1 } }] } });
  return { token, combatant, toggleStatusEffect };
};

describe('charge movement condition', () => {
  it('applies charged immediately after paid charge movement reaches an enemy', async () => {
    const { token, combatant, toggleStatusEffect } = buildMovement();
    token.completeMovement('charge');
    await vi.waitFor(() => expect(toggleStatusEffect).toHaveBeenCalledWith(CHARGED_CONDITION_ID, { active: true }));
    expect(getActionEconomy(combatant).used.chargedThisTurn).toBe(true);
    expect(getActionEconomy(combatant).actions).toMatchObject({ move: 0, standard: 0 });
  });

  it('clears the charge condition and flag on native movement Undo', async () => {
    const { token, combatant, toggleStatusEffect } = buildMovement();
    token.completeMovement('charge');
    await vi.waitFor(() => expect(toggleStatusEffect).toHaveBeenCalledWith(CHARGED_CONDITION_ID, { active: true }));
    token.completeMovement('charge', true);
    await vi.waitFor(() => expect(toggleStatusEffect).toHaveBeenCalledWith(CHARGED_CONDITION_ID, { active: false }));
    expect(getActionEconomy(combatant).used.chargedThisTurn).toBe(false);
    expect(getActionEconomy(combatant).actions).toMatchObject({ move: 1, standard: 1 });
  });

  it('does not apply charged for a different full-round movement action', async () => {
    const { token, combatant, toggleStatusEffect } = buildMovement();
    token.completeMovement('withdraw');
    await vi.waitFor(() => expect(combatant.getFlag('dnd35e', 'movementSession')).toBeDefined());
    expect(toggleStatusEffect).not.toHaveBeenCalled();
    expect(getActionEconomy(combatant).used.chargedThisTurn).toBe(false);
  });
});
