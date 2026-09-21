/**
 * Drop Prone / Stand Up chat card — a compact toggle announcement distinct from
 * `moveActionCard.mts`'s distance/budget card (the toggle it announces isn't real
 * movement, so a "cost / budget" line would be meaningless here).
 *
 * @module
 */
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { applyProneToggle } from '@canvas/token/logic/proneToggle.mjs';
import type { ChatMessageSource } from '@common/documents/chat-message.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { TokenDocumentDnd35e } from '@documents/scene/tokenDocument/TokenDocumentDnd35e.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import proneToggleCardTemplateSource from './prone-toggle-card.hbs?raw';

const proneToggleCardTemplate = Handlebars.compile(proneToggleCardTemplateSource, { preventIndent: true });

/** Persisted in `message.flags.dnd35e.proneToggleCard` — everything needed to re-render the card, or revert the Prone condition, after the Undo button is clicked. */
interface ProneToggleCardFlags {
  combatantId: string;
  /** `true` for Drop Prone, `false` for Stand Up — determines the card's label. */
  droppedProne: boolean;
  /** Whether the actor had the Prone condition *before* this toggle — restored on Undo. */
  priorActive: boolean;
  undone: boolean;
}

/** Shared by the initial post and the Undo button's re-render. */
function buildProneToggleCardContent(combatantName: string, flags: ProneToggleCardFlags): string {
  return proneToggleCardTemplate({
    combatantName,
    label: game.i18n.localize(
      flags.droppedProne ? 'dnd35e.ROLL.PRONE_TOGGLE_CARD.DroppedProne' : 'dnd35e.ROLL.PRONE_TOGGLE_CARD.StoodUp'
    ),
    undone: flags.undone,
  });
}

/** Posts the compact Drop Prone/Stand Up card. */
async function buildProneToggleCard(
  combatant: CombatantDnd35e,
  actor: ActorDnd35e,
  droppedProne: boolean,
  priorActive: boolean
): Promise<string | null> {
  const flags: ProneToggleCardFlags = {
    combatantId: combatant.id,
    droppedProne,
    priorActive,
    undone: false,
  };

  const message = await ChatMessage.create({
    content: buildProneToggleCardContent(combatant.name, flags),
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: { dnd35e: { proneToggleCard: flags } },
  } as unknown as ChatMessageSource);
  return message?.id ?? null;
}

/** Reverts the Prone condition/movement action directly (no movement operation to undo anymore) and marks the card undone in place. */
async function onUndoProneToggle(message: ChatMessage, flags: ProneToggleCardFlags, combatant: CombatantDnd35e): Promise<void> {
  if (flags.undone) return;

  const actor = combatant.actor as ActorDnd35e | null;
  const token = combatant.token as TokenDocumentDnd35e | null;
  if (actor && token) await applyProneToggle(actor, token, flags.priorActive);

  const updatedFlags: ProneToggleCardFlags = { ...flags, undone: true };
  await message.update({
    content: buildProneToggleCardContent(combatant.name, updatedFlags),
    'flags.dnd35e.proneToggleCard': updatedFlags,
  });
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
  undoProneButton.addEventListener('click', () => { void onUndoProneToggle(message, flags, combatant); });
}

export { buildProneToggleCard, buildProneToggleCardContent, wireProneToggleCardButton };
export type { ProneToggleCardFlags };
