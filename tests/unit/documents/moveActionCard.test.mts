import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { getActionEconomy } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { getMovementSession } from '@documents/combat/combatant/movementSession.mjs';
import { snapTokenToPosition } from '@documents/token/logic/snapTokenPosition.mjs';
import type { MoveActionCardFlags } from '@source/dice/chatCards/moveActionCard/moveActionCard.mjs';
import { syncMovementCardSpend, upsertMoveActionCard, wireMoveActionCardButton } from '@source/dice/chatCards/moveActionCard/moveActionCard.mjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@settings/index.mjs', () => ({
  useSettingsStore: () => ({ measurement: { distanceDisplayShortLabel: { value: 'ft' } } }),
}));
vi.mock('@documents/token/logic/snapTokenPosition.mjs', () => ({ snapTokenToPosition: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

describe('movement-card full attack bookkeeping', () => {
  it('retains a free step origin and allows Undo without refunding the full attack', async () => {
    const origin = { x: 100, y: 200, elevation: 0 };
    let cardFlags: MoveActionCardFlags | undefined;
    const update = vi.fn(async (data: Record<string, unknown>) => {
      cardFlags = data['flags.dnd35e.moveActionCard'] as MoveActionCardFlags;
    });
    const message = { id: 'step-card', update };
    const flags: Record<string, unknown> = {
      actionEconomy: { actions: { standard: 0, move: 0 }, used: { standardAttackUsed: true, fullAttackUsed: true } },
      movementSession: { category: 'step', cumulativeCost: 5, spentTiers: [], messageId: 'step-card' },
    };
    const combatant = {
      id: 'combatant', name: 'Attacker', token: {}, isOwner: true,
      getFlag: (_scope: string, key: string) => flags[key],
      setFlag: async (_scope: string, key: string, value: unknown) => { flags[key] = value; },
    } as unknown as CombatantDnd35e;
    const create = vi.fn(async (data: { flags: { dnd35e: { moveActionCard: MoveActionCardFlags } } }) => {
      cardFlags = data.flags.dnd35e.moveActionCard;
      return message;
    });
    vi.stubGlobal('CONFIG', { Token: { movement: { actions: { fiveFootStep: { label: 'Step' } } } } });
    vi.stubGlobal('ChatMessage', { create, getSpeaker: () => ({}) });
    vi.stubGlobal('game', {
      ...game, combat: { combatants: { get: () => combatant } },
    });
    await upsertMoveActionCard(combatant, {} as ActorDnd35e, 'fiveFootStep',
      { spent: [], cost: 5, budget: 5, overBudget: false, provokes: false }, origin, null);
    expect(cardFlags?.priorPosition).toEqual(origin);

    let click: (() => void) | undefined;
    const button = { addEventListener: (_event: string, callback: () => void) => { click = callback; }, remove: vi.fn() };
    const html = { querySelector: () => button } as unknown as HTMLElement;
    const chatMessage = { ...message, getFlag: () => cardFlags } as unknown as ChatMessage;
    wireMoveActionCardButton(chatMessage, html);
    expect(click).toBeDefined();
    click!();
    await vi.waitFor(() => expect(cardFlags?.undone).toBe(true));
    expect(snapTokenToPosition).toHaveBeenCalledWith(combatant.token, origin);
    expect(getMovementSession(combatant).category).toBeNull();
    expect(getActionEconomy(combatant).actions).toMatchObject({ standard: 0, move: 0 });
  });

  it('updates the card ledger when the step reservation is reassigned', async () => {
    const flags = {
      spent: ['move'], isSessionCard: true, undone: false, priorPosition: { x: 0, y: 0, elevation: 0 },
    } as MoveActionCardFlags;
    const message = { getFlag: () => flags, update: vi.fn() };
    const combatant = {
      name: 'Attacker',
      getFlag: () => ({ category: 'step', cumulativeCost: 5, spentTiers: [], messageId: 'step-card' }),
    } as unknown as CombatantDnd35e;
    vi.stubGlobal('game', { ...game, messages: { get: () => message } });
    await syncMovementCardSpend(combatant);
    expect(message.update).toHaveBeenCalledWith(expect.objectContaining({
      'flags.dnd35e.moveActionCard': expect.objectContaining({ spent: [], priorPosition: flags.priorPosition }),
    }));
  });
});
