/**
 * Delegated click handlers for interactive chat-card buttons (`data-action="..."`).
 * Foundry has no per-button-type hook — every card's action buttons are dispatched from
 * this single `renderChatMessageHTML` registration by `data-action`, mirroring the
 * approach `renderChatMessageHTML` is documented for in phase-10-basic-combat.md §10.6.
 * Foundry's own `expandRoll` toggle (used by `save-roll-card.hbs`) needs no registration
 * here — it's core's built-in behavior, not one of ours.
 *
 * @module
 */
import { snapTokenToPosition } from '@canvas/token/logic/snapTokenPosition.mjs';
import { DOCUMENT_UPDATE_TYPES } from '@constants/documentUpdateTypes.mjs';
import { syncContainmentAe } from '@documents/activeEffects/containment/logic/containmentAe.mjs';
import { refundAction } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import { resetMovementSession } from '@documents/combat/combatant/movementSession.mjs';
import type { Container } from '@items/physical/container/index.mjs';
import type { EquippableItem } from '@items/physical/equippableItem/index.mjs';
import type { PhysicalItem } from '@items/physical/physicalItem/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import type { ItemActionSpentCardFlags, MoveActionCardFlags, ProneToggleCardFlags } from './rollMessages.mjs';
import { buildItemActionSpentCardContent, buildMoveActionCardContent } from './rollMessages.mjs';

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

/**
 * Refunds the action-economy spend and reverts the item's own equip/stow state — tagged
 * `isUndo: true` so `equipped.mts`/`stowed.mts`'s listeners don't re-spend for this same
 * update (see `ItemActionSpentCardFlags.revert`). Routed through `syncContainmentAe()` for
 * the stow case (not a raw field update) so container weight/AE rollup stays consistent.
 */
async function onUndoItemActionSpent(message: ChatMessage, flags: ItemActionSpentCardFlags, combatant: CombatantDnd35e): Promise<void> {
  if (flags.undone) return;

  await refundAction(combatant, flags.spent);

  const item = await foundry.utils.fromUuid(flags.itemUuid) as (EquippableItem | PhysicalItem) | null;
  if (item) {
    if (flags.revert.kind === 'equip') {
      await item.update(
        { 'system.equippedSlotIds': flags.revert.priorSlotIds },
        { updateMetadata: { updateType: DOCUMENT_UPDATE_TYPES.EQUIP_STATUS_UPDATE, isUndo: true } }
      );
    }
    else {
      const priorContainer = flags.revert.priorContainerUuid
        ? await foundry.utils.fromUuid(flags.revert.priorContainerUuid) as Container | null
        : null;
      await syncContainmentAe(item as PhysicalItem, priorContainer, true);
    }
  }

  const updatedFlags: ItemActionSpentCardFlags = { ...flags, undone: true };
  await message.update({
    content: buildItemActionSpentCardContent(combatant.name, updatedFlags),
    'flags.dnd35e.itemActionSpentCard': updatedFlags,
  });
}

function registerChatCardActions(): void {
  // dnd35e type-fix: `renderChatMessageHTML` has no typed overload in Hooks.on() (see
  // hooks.d.mts) — it falls through to the generic `HookParameters<string, unknown[]>`
  // signature, so the callback's params arrive untyped and are cast per the documented
  // real signature (see foundry-hooks-cheatsheet.md).
  Hooks.on('renderChatMessageHTML', (rawMessage: unknown, rawHtml: unknown) => {
    const message = rawMessage as ChatMessage;
    const html = rawHtml as HTMLElement;

    const undoButton = html.querySelector<HTMLElement>('[data-action="undo-move-action"]');
    if (undoButton) {
      const flags = message.getFlag(SYSTEM_ID, 'moveActionCard') as MoveActionCardFlags | undefined;
      const combatant = flags ? (game.combat?.combatants.get(flags.combatantId) as CombatantDnd35e | undefined) : undefined;
      if (!flags || !combatant || !(game.user?.isGM || combatant.isOwner)) {
        undoButton.remove();
      } else {
        undoButton.addEventListener('click', () => { void onUndoMoveAction(message, flags, combatant); });
      }
    }

    const undoProneButton = html.querySelector<HTMLElement>('[data-action="undo-prone-toggle"]');
    if (undoProneButton) {
      const flags = message.getFlag(SYSTEM_ID, 'proneToggleCard') as ProneToggleCardFlags | undefined;
      const combatant = flags ? (game.combat?.combatants.get(flags.combatantId) as CombatantDnd35e | undefined) : undefined;
      if (!flags || !combatant || !(game.user?.isGM || combatant.isOwner)) {
        undoProneButton.remove();
      } else {
        undoProneButton.addEventListener('click', () => { void onUndoProneToggle(flags, combatant); });
      }
    }

    const undoItemActionButton = html.querySelector<HTMLElement>('[data-action="undo-item-action-spent"]');
    if (undoItemActionButton) {
      const flags = message.getFlag(SYSTEM_ID, 'itemActionSpentCard') as ItemActionSpentCardFlags | undefined;
      const combatant = flags ? (game.combat?.combatants.get(flags.combatantId) as CombatantDnd35e | undefined) : undefined;
      if (!flags || !combatant || !(game.user?.isGM || combatant.isOwner)) {
        undoItemActionButton.remove();
      } else {
        undoItemActionButton.addEventListener('click', () => { void onUndoItemActionSpent(message, flags, combatant); });
      }
    }
  });
}

export { registerChatCardActions };
