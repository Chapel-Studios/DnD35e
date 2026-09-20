/**
 * Drop Prone / Stand Up chat card — a compact toggle announcement distinct from
 * `moveActionCard.mts`'s distance/budget card (the confirming drag that triggers this
 * toggle isn't real movement, so a "cost / budget" line would be meaningless here).
 *
 * @module
 */
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { ChatMessageSource } from '@common/documents/chat-message.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import proneToggleCardTemplateSource from './prone-toggle-card.hbs?raw';

const proneToggleCardTemplate = Handlebars.compile(proneToggleCardTemplateSource, { preventIndent: true });

/** Persisted in `message.flags.dnd35e.proneToggleCard` — everything needed to re-render the card, or revert the Prone condition, after Undo (button click or Foundry's native Ctrl+Z). */
interface ProneToggleCardFlags {
  combatantId: string;
  /** `true` for Drop Prone, `false` for Stand Up — determines the card's label. */
  droppedProne: boolean;
  /** Whether the actor had the Prone condition *before* this toggle — restored on Undo, independent of whatever the session/live actor state looks like by the time Undo happens. */
  priorActive: boolean;
  /** The confirming drag's `movement.id` — lets the card's Undo button call `TokenDocument#revertRecordedMovement()` directly, Foundry's own recorded-movement undo, instead of a manual revert. */
  movementId: string;
  undone: boolean;
}

/** Shared by the initial post and both Undo paths' re-render — see TokenDocumentDnd35e#reconcileProneToggle. */
function buildProneToggleCardContent(combatantName: string, flags: ProneToggleCardFlags): string {
  return proneToggleCardTemplate({
    combatantName,
    label: game.i18n.localize(
      flags.droppedProne ? 'dnd35e.ROLL.PRONE_TOGGLE_CARD.DroppedProne' : 'dnd35e.ROLL.PRONE_TOGGLE_CARD.StoodUp'
    ),
    undone: flags.undone,
  });
}

/**
 * Posts the compact Drop Prone/Stand Up card. Returns the created message's id so
 * `TokenDocumentDnd35e` can track it on the movement session for both Undo paths.
 */
async function buildProneToggleCard(
  combatant: CombatantDnd35e,
  actor: ActorDnd35e,
  droppedProne: boolean,
  priorActive: boolean,
  movementId: string
): Promise<string | null> {
  const flags: ProneToggleCardFlags = {
    combatantId: combatant.id,
    droppedProne,
    priorActive,
    movementId,
    undone: false,
  };

  const message = await ChatMessage.create({
    content: buildProneToggleCardContent(combatant.name, flags),
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: { dnd35e: { proneToggleCard: flags } },
  } as unknown as ChatMessageSource);
  return message?.id ?? null;
}

async function onUndoProneToggle(flags: ProneToggleCardFlags, combatant: CombatantDnd35e): Promise<void> {
  if (flags.undone) return;

  // Routed through Foundry's own `revertRecordedMovement()` (the same recorded-movement undo
  // Ctrl+Z ultimately relies on) rather than manually flipping the condition back — a manual
  // revert left the confirming drag's waypoint stuck in `_movementHistory` forever, corrupting
  // later distance/budget accounting. This also re-triggers `_onUpdateMovement` with
  // `isUndo: true`, so `TokenDocumentDnd35e#reconcileProneToggle` reverts the condition and
  // marks this card undone itself — nothing further to do here.
  const token = combatant.token as TokenDocument | null;
  await token?.revertRecordedMovement(flags.movementId);
}

/** Wires the "Undo" button, gated to GM/combatant-owner — see registerChatCardActions.mts. */
function wireProneToggleCardButton(message: ChatMessage, html: HTMLElement): void {
  const undoProneButton = html.querySelector<HTMLElement>('[data-action="undo-prone-toggle"]');
  if (!undoProneButton) return;

  const flags = message.getFlag(SYSTEM_ID, 'proneToggleCard') as ProneToggleCardFlags | undefined;
  const combatant = flags ? (game.combat?.combatants.get(flags.combatantId) as CombatantDnd35e | undefined) : undefined;
  if (!flags || !combatant || !(game.user?.isGM || combatant.isOwner)) {
    undoProneButton.remove();
    return;
  }
  undoProneButton.addEventListener('click', () => { void onUndoProneToggle(flags, combatant); });
}

export { buildProneToggleCard, buildProneToggleCardContent, wireProneToggleCardButton };
export type { ProneToggleCardFlags };
