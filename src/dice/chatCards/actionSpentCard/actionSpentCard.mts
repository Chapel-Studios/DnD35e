/**
 * Action Spent chat card for a successful equip/unequip/stow/retrieve action-economy spend
 * (see `equippableItem/events/equipped.mts` and `physicalItem/events/stowed.mts`) — the
 * announcement half of the same mechanic `actionWarningCard.mts` covers for the failure case.
 *
 * @module
 */
import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import type { ChatMessageSource } from '@common/documents/chat-message.mjs';
import type { ActionEconomyType } from '@constants/actionEconomy.mjs';
import { DOCUMENT_UPDATE_TYPES } from '@constants/documentUpdateTypes.mjs';
import { syncContainmentAe } from '@documents/activeEffects/containment/logic/containmentAe.mjs';
import { refundAction } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { Container } from '@items/physical/container/index.mjs';
import type { EquippableItem } from '@items/physical/equippableItem/index.mjs';
import type { PhysicalItem } from '@items/physical/physicalItem/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import actionSpentCardTemplateSource from './action-spent-card.hbs?raw';

const actionSpentCardTemplate = Handlebars.compile(actionSpentCardTemplateSource, { preventIndent: true });

/** Localized labels for the action-economy tiers an item's automatic spend can consume — `standard`/`minor`/`fullRound`/`aoo` aren't currently reachable by equip/stow, but are included so a future caller doesn't silently render the raw tier key. */
const ITEM_ACTION_TIER_LABEL_KEYS: Partial<Record<ActionEconomyType, string>> = {
  free: 'dnd35e.ROLL.ITEM_ACTION_SPENT_CARD.FreeAction',
  move: 'dnd35e.ROLL.ITEM_ACTION_SPENT_CARD.MoveAction',
  standard: 'dnd35e.ROLL.MOVE_ACTION_CARD.StandardAction',
};

/** Persisted in `message.flags.dnd35e.itemActionSpentCard` — everything needed to re-render the card, or revert the item's equip/stow state, after Undo. */
interface ItemActionSpentCardFlags {
  combatantId: string;
  /** Already-localized "Equipped {item}"/"Stowed {item}" etc. label — see ITEM_ACTION_TIER_LABEL_KEYS. */
  actionLabel: string;
  spent: ActionEconomyType[];
  itemUuid: string;
  /** Which field to restore, and to what value, on Undo — distinct shapes since equip and stow touch different `system` fields. */
  revert: { kind: 'equip'; priorSlotIds: string[] } | { kind: 'stow'; priorContainerUuid: string | null };
  undone: boolean;
}

/** Shared by the initial post and the Undo click handler's re-render. */
function buildItemActionSpentCardContent(combatantName: string, flags: ItemActionSpentCardFlags): string {
  return actionSpentCardTemplate({
    combatantName,
    actionLabel: flags.actionLabel,
    spentLabels: flags.spent.map((tier) => game.i18n.localize(ITEM_ACTION_TIER_LABEL_KEYS[tier] ?? tier)),
    undone: flags.undone,
  });
}

/**
 * Posts the Action Spent card. Includes an Undo button that refunds the spent action(s) and
 * reverts the item's equip/stow state (see `revert` in `ItemActionSpentCardFlags`).
 */
async function buildItemActionSpentCard(
  combatant: CombatantDnd35e,
  actor: ActorDnd35e,
  actionLabel: string,
  spent: ActionEconomyType[],
  revertData: Pick<ItemActionSpentCardFlags, 'itemUuid' | 'revert'>
): Promise<string | null> {
  const flags: ItemActionSpentCardFlags = {
    ...revertData,
    combatantId: combatant.id,
    actionLabel,
    spent,
    undone: false,
  };

  const message = await ChatMessage.create({
    content: buildItemActionSpentCardContent(combatant.name, flags),
    speaker: ChatMessage.getSpeaker({ actor }),
    flags: { dnd35e: { itemActionSpentCard: flags } },
  } as unknown as ChatMessageSource);
  return message?.id ?? null;
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

/** Wires the "Undo" button, gated to GM/combatant-owner — see registerChatCardActions.mts. */
function wireItemActionSpentCardButton(message: ChatMessage, html: HTMLElement): void {
  const undoItemActionButton = html.querySelector<HTMLElement>('[data-action="undo-item-action-spent"]');
  if (!undoItemActionButton) return;

  const flags = message.getFlag(SYSTEM_ID, 'itemActionSpentCard') as ItemActionSpentCardFlags | undefined;
  const combatant = flags ? (game.combat?.combatants.get(flags.combatantId) as CombatantDnd35e | undefined) : undefined;
  if (!flags || !combatant || !(game.user?.isGM || combatant.isOwner)) {
    undoItemActionButton.remove();
    return;
  }
  undoItemActionButton.addEventListener('click', () => { void onUndoItemActionSpent(message, flags, combatant); });
}

export { buildItemActionSpentCard, buildItemActionSpentCardContent, wireItemActionSpentCardButton };
export type { ItemActionSpentCardFlags };
