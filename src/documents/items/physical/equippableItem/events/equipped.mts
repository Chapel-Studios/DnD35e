import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { Creature } from '@actors/creature/index.mjs';
import { ACTION_ECONOMY } from '@constants/actionEconomy.mjs';
import { spendAction } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';
import { weaponItemType } from '@items/itemTypes.mjs';
import { buildActionEconomyWarningCard, buildItemActionSpentCard } from '@source/dice/index.mjs';

import type { EquippableItem, EquippableItemSystemData } from '../index.mjs';

// SRD "Draw or Sheathe a Weapon" / "Ready or Loose a Shield": BAB +1 or higher lets you
// draw/ready as a free action combined with a regular move. No such exception exists for
// other equippable items (SRD "Manipulate an Item" is a plain move action) — add shield's
// item type here once it exists as its own EquippableItem subclass.
const FREE_ACTION_AT_BAB_1_ITEM_TYPES: string[] = [weaponItemType];

const ITEM_EQUIPPED_EVENT = 'itemEquipped';
const ITEM_UNEQUIPPED_EVENT = 'itemUnequipped';

interface EquippedItemPayload {
  item: EquippableItem;
  slotIds: string[];
  /** `system.equippedSlotIds` immediately before this update — lets Undo restore the exact prior slot(s) rather than just re-equipping to the item's default slot. */
  priorSlotIds: string[];
  /** Set when this update is itself an Undo-button revert — the action-economy listener below no-ops on this to avoid re-spending. */
  isUndo?: boolean;
  sourceMsg?: string;
  sourceActorId?: string;
}

interface EquippedItemEvent extends DocumentEvent {
  type: typeof ITEM_EQUIPPED_EVENT | typeof ITEM_UNEQUIPPED_EVENT;
  payload: EquippedItemPayload;
}

interface CheckForEquippedItemEventParams {
  parent: EquippableItem;
  updateData: Record<string, unknown>;
  sourceMsg?: string;
  sourceActorId?: string;
  isUndo?: boolean;
}

// this is for an item to see if it has been equipped or unequipped, and to fire the appropriate event
const checkForEquippedItemEvent: EventChecker<EquippedItemPayload> = (
  { parent, updateData, ...payloadMetaData }: CheckForEquippedItemEventParams
) => {
  const result: EventCheckResult<EquippedItemPayload> = {
    documentId: parent.id,
    event: ITEM_EQUIPPED_EVENT,
    result: false,
    args: [],
  };

  const updateSystem = updateData.system as EquippableItemSystemData | undefined;
  if (!Array.isArray(updateSystem?.equippedSlotIds)) {
    return result;
  }

  const isEquipped = updateSystem.equippedSlotIds.length > 0;
  const eventType = isEquipped
    ? ITEM_EQUIPPED_EVENT
    : ITEM_UNEQUIPPED_EVENT;

  result.event = eventType;
  result.result = true;
  result.payload = {
    item: parent,
    slotIds: updateSystem.equippedSlotIds,
    // `parent` still reflects pre-update state here — this checker runs from `_preUpdate`,
    // before `updateData` is applied to the document.
    priorSlotIds: parent.system.equippedSlotIds,
    isUndo: payloadMetaData.isUndo,
    sourceMsg: payloadMetaData.sourceMsg,
    sourceActorId: payloadMetaData.sourceActorId,
  };

  return result;
};

/**
 * Spends a move action (poc.10 §10.3) whenever an equippable item is equipped or
 * unequipped mid-combat — a separate, always-on mechanic, independent of any specific
 * weapon action's `requiresEquipped` flag. No-ops outside an active combat, or if the
 * item's parent actor has no combatant in the current encounter. Downgrades to a free
 * action for weapons/shields when the actor's BAB is +1 or higher (SRD exception). Posts a
 * warning card if the combatant has no move action left to spend, or an Action Spent card
 * (with Undo) when the spend succeeds.
 */
async function spendEquipMoveAction (item: EquippableItem, isEquipping: boolean, priorSlotIds: string[]): Promise<void> {
  if (!game.combat?.started) return;
  const actor = item.actor;
  if (!actor) return;
  const combatant = game.combat.getCombatantsByActor(actor.id)[0] as CombatantDnd35e | undefined;
  if (!combatant) return;

  const bab = actor instanceof Creature ? actor.system.bab : 0;
  const tier = FREE_ACTION_AT_BAB_1_ITEM_TYPES.includes(item.type) && bab >= 1
    ? ACTION_ECONOMY.FREE
    : ACTION_ECONOMY.MOVE;
  const spent = await spendAction(combatant, [tier]);
  if (!spent) {
    const messageKey = isEquipping
      ? 'dnd35e.ROLL.ACTION_WARNING_CARD.InsufficientMoveEquip'
      : 'dnd35e.ROLL.ACTION_WARNING_CARD.InsufficientMoveUnequip';
    await buildActionEconomyWarningCard(combatant, actor as ActorDnd35e, game.i18n.format(messageKey, { name: combatant.name, item: item.name }));
    return;
  }

  const actionLabelKey = isEquipping
    ? 'dnd35e.ROLL.ITEM_ACTION_SPENT_CARD.Equipped'
    : 'dnd35e.ROLL.ITEM_ACTION_SPENT_CARD.Unequipped';
  await buildItemActionSpentCard(combatant, actor as ActorDnd35e, game.i18n.format(actionLabelKey, { item: item.name }), spent, {
    itemUuid: item.uuid,
    revert: { kind: 'equip', priorSlotIds },
  });
}

/** Subscribes the item to its own equip/unequip lifecycle events (see `spendEquipMoveAction`). */
function registerEquipActionEconomyListener (item: EquippableItem): void {
  item.events.on<EquippedItemEvent>(ITEM_EQUIPPED_EVENT, (event) => {
    if (event.payload.isUndo) return;
    void spendEquipMoveAction(item, true, event.payload.priorSlotIds);
  });
  item.events.on<EquippedItemEvent>(ITEM_UNEQUIPPED_EVENT, (event) => {
    if (event.payload.isUndo) return;
    void spendEquipMoveAction(item, false, event.payload.priorSlotIds);
  });
}

export type {
  CheckForEquippedItemEventParams,
  EquippedItemEvent,
  EquippedItemPayload,
};

export {
  checkForEquippedItemEvent,
  ITEM_EQUIPPED_EVENT,
  ITEM_UNEQUIPPED_EVENT,
  registerEquipActionEconomyListener,
};
