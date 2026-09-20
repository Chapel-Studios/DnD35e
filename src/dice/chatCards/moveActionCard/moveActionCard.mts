/**
 * Move Action Spent chat card — posted whenever `TokenDocumentDnd35e#_onUpdateMovement`
 * spends a move/standard action from movement, or flags an over-budget move that spent
 * nothing.
 *
 * @module
 */
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { snapTokenToPosition } from '@canvas/token/logic/snapTokenPosition.mjs';
import type { ChatMessageSource } from '@common/documents/chat-message.mjs';
import type { ActionEconomyType } from '@constants/actionEconomy.mjs';
import { refundAction } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { resetMovementSession } from '@documents/combat/combatant/movementSession.mjs';
import { useSettingsStore } from '@settings/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import moveActionCardTemplateSource from './move-action-card.hbs?raw';

const moveActionCardTemplate = Handlebars.compile(moveActionCardTemplateSource, { preventIndent: true });

/** Data a caller computes about the move — everything `buildMoveActionCard()` needs beyond the combatant/actor/action themselves. */
interface MoveActionCardData {
  spent: ActionEconomyType[];
  /** Already converted to the scene's localized distance units (ft/m) — see `movement.passed.cost`. */
  cost: number;
  /** Already converted to the scene's localized distance units — see `TokenRulerDnd35e#getLocalizedBudget()`. */
  budget: number;
  overBudget: boolean;
  /**
   * Which over-budget message to show — distinct from the generic "moved further than
   * allowed" message for a 5-foot step (fixed 1-square allowance), mixing a 5-foot step
   * with other movement in the same turn, exceeding a session already escalated to a
   * full-round Double Move, or running out of actions to cover a move that would
   * otherwise be affordable. Defaults to `'distance'` (the original generic message)
   * when omitted.
   */
  overBudgetReason?: 'distance' | 'fiveFootStep' | 'mixedMovement' | 'doubleMove' | 'insufficientActions';
}

/** Persisted in `message.flags.dnd35e.moveActionCard` — everything needed to re-render the card after Undo, without re-deriving anything from the (possibly since-changed) combatant/actor. */
interface MoveActionCardFlags extends MoveActionCardData {
  combatantId: string;
  movementActionLabel: string;
  priorPosition: { x: number; y: number; elevation: number } | null;
  undone: boolean;
  /**
   * Whether this card belongs to the per-turn cumulative movement session (walk/run/crawl/
   * 5-foot-step — see `movementSession.mts`) rather than a one-shot full-round move (charge/
   * withdraw/double move). Undo needs this to know whether to also reset the combatant's
   * movement session (allowing fresh movement this turn) alongside refunding the action(s).
   */
  isSessionCard: boolean;
}

const OVER_BUDGET_MESSAGE_KEYS: Record<NonNullable<MoveActionCardData['overBudgetReason']>, string> = {
  distance: 'dnd35e.ROLL.MOVE_ACTION_CARD.OverBudget',
  fiveFootStep: 'dnd35e.ROLL.MOVE_ACTION_CARD.OverBudgetFiveFootStep',
  mixedMovement: 'dnd35e.ROLL.MOVE_ACTION_CARD.OverBudgetMixedMovement',
  doubleMove: 'dnd35e.ROLL.MOVE_ACTION_CARD.OverBudgetDoubleMove',
  insufficientActions: 'dnd35e.ROLL.MOVE_ACTION_CARD.OverBudgetInsufficientActions',
};

/** Shared by the initial post, the session upsert, and the Undo click handler's re-render. */
function buildMoveActionCardContent(combatantName: string, flags: MoveActionCardFlags): string {
  const { measurement: { distanceDisplayShortLabel } } = useSettingsStore();
  return moveActionCardTemplate({
    combatantName,
    movementActionLabel: flags.movementActionLabel,
    cost: flags.cost,
    budget: flags.budget,
    distanceUnit: distanceDisplayShortLabel.value,
    overBudget: flags.overBudget,
    overBudgetMessage: flags.overBudget
      ? game.i18n.localize(OVER_BUDGET_MESSAGE_KEYS[flags.overBudgetReason ?? 'distance'])
      : '',
    showUndo: flags.spent.length > 0,
    undone: flags.undone,
    spentLabels: flags.spent.map((action) =>
      game.i18n.localize(action === 'move' ? 'dnd35e.ROLL.MOVE_ACTION_CARD.MoveAction' : 'dnd35e.ROLL.MOVE_ACTION_CARD.StandardAction')
    ),
  });
}

/**
 * Posts the Move Action Spent card (see phase-10-basic-combat.md §10.6) whenever
 * `TokenDocumentDnd35e#_onUpdateMovement` spends a move/standard action from movement, or
 * flags an over-budget move that spent nothing. `priorPosition` is only stored when
 * something was actually spent — the `overBudget` branch never committed a move, so
 * there's nothing to undo. Returns the created message's id, so callers tracking a
 * one-shot full-round move (Charge/Withdraw/Double Move) can later locate and mark it
 * undone if Foundry's native movement Undo reverts that drag.
 */
async function buildMoveActionCard(
  combatant: CombatantDnd35e,
  actor: ActorDnd35e,
  movementAction: string,
  data: MoveActionCardData,
  priorPosition: { x: number; y: number; elevation: number } | null
): Promise<string | null> {
  const movementActionLabel = game.i18n.localize(CONFIG.Token.movement.actions[movementAction]?.label ?? movementAction);
  const flags: MoveActionCardFlags = {
    ...data,
    combatantId: combatant.id,
    movementActionLabel,
    priorPosition: data.spent.length > 0 ? priorPosition : null,
    undone: false,
    isSessionCard: false,
  };

  // Cast needed: same ambient schema-required-fields mismatch documented at
  // `Creature#rollSave()`'s `roll.toMessage()` call — `ChatMessage.create()`'s data param
  // resolves to a fully-required `SourceFromSchema<ChatMessageSchema>` shape at compile time,
  // even though Foundry fills in every other field (`_id`, `type`, `system`, etc.) at runtime.
  const message = await ChatMessage.create({
    content: buildMoveActionCardContent(combatant.name, flags),
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: { dnd35e: { moveActionCard: flags } },
  } as unknown as ChatMessageSource);
  return message?.id ?? null;
}

/**
 * Session-aware variant of `buildMoveActionCard()` used by the per-turn cumulative movement
 * session (5-foot step / walk / run / crawl — see `movementSession.mts`): updates the same
 * chat message in place across multiple partial drags in the same turn instead of always
 * posting a new one, so a player moving in several increments only ever sees a single,
 * running "Move Action Spent" card for that turn. Returns the (possibly newly-created)
 * message's id, to be stored back on the movement session.
 */
async function upsertMoveActionCard(
  combatant: CombatantDnd35e,
  actor: ActorDnd35e,
  movementAction: string,
  data: MoveActionCardData,
  firstOrigin: { x: number; y: number; elevation: number } | null,
  existingMessageId: string | null
): Promise<string | null> {
  const movementActionLabel = game.i18n.localize(CONFIG.Token.movement.actions[movementAction]?.label ?? movementAction);
  const flags: MoveActionCardFlags = {
    ...data,
    combatantId: combatant.id,
    movementActionLabel,
    priorPosition: data.spent.length > 0 ? firstOrigin : null,
    undone: false,
    isSessionCard: true,
  };

  const existingMessage = existingMessageId ? game.messages?.get(existingMessageId) : undefined;
  if (existingMessage) {
    await existingMessage.update({
      content: buildMoveActionCardContent(combatant.name, flags),
      'flags.dnd35e.moveActionCard': flags,
    });
    return existingMessage.id;
  }

  const created = (await ChatMessage.create({
    content: buildMoveActionCardContent(combatant.name, flags),
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: { dnd35e: { moveActionCard: flags } },
  } as unknown as ChatMessageSource)) as ChatMessage | undefined;
  return created?.id ?? null;
}

async function onUndoMoveAction(message: ChatMessage, flags: MoveActionCardFlags, combatant: CombatantDnd35e): Promise<void> {
  if (flags.undone) return;

  await refundAction(combatant, flags.spent);

  // The token physically moved — refunding the action(s) without also undoing the displacement
  // would leave the character standing somewhere its action economy says it never went. Routed
  // through the `displace`-action movement operation (same trick as the Drop Prone/Stand Up
  // snap-back) rather than a plain field update — a plain update still runs through the full
  // movement pipeline and would be mistaken for a fresh, chargeable move, posting a spurious
  // second "Move Action Spent" card for what is actually an undo.
  if (flags.priorPosition && combatant.token) {
    await snapTokenToPosition(combatant.token as TokenDocument, flags.priorPosition);
  }

  // Session cards (5-foot step / walk / run / crawl) track cumulative cost and spent tiers
  // across the whole turn — undoing one must clear that session entirely so the combatant can
  // move freely again this turn, not just refund this single card's own `spent` list.
  if (flags.isSessionCard) await resetMovementSession(combatant);

  const updatedFlags: MoveActionCardFlags = { ...flags, undone: true };
  await message.update({
    content: buildMoveActionCardContent(combatant.name, updatedFlags),
    'flags.dnd35e.moveActionCard': updatedFlags,
  });
}

/** Wires the "Undo" button, gated to GM/combatant-owner — see registerChatCardActions.mts. */
function wireMoveActionCardButton(message: ChatMessage, html: HTMLElement): void {
  const undoButton = html.querySelector<HTMLElement>('[data-action="undo-move-action"]');
  if (!undoButton) return;

  const flags = message.getFlag(SYSTEM_ID, 'moveActionCard') as MoveActionCardFlags | undefined;
  const combatant = flags ? (game.combat?.combatants.get(flags.combatantId) as CombatantDnd35e | undefined) : undefined;
  if (!flags || !combatant || !(game.user?.isGM || combatant.isOwner)) {
    undoButton.remove();
    return;
  }
  undoButton.addEventListener('click', () => { void onUndoMoveAction(message, flags, combatant); });
}

export {
  buildMoveActionCard,
  buildMoveActionCardContent,
  upsertMoveActionCard,
  wireMoveActionCardButton,
};
export type { MoveActionCardData, MoveActionCardFlags };
