import type { ActorDnd35e } from '@actors/baseActor/index.mjs';
import { ACTION_ECONOMY } from '@constants/actionEconomy.mjs';
import { spendAction } from '@documents/combat/combatant/combatantActionEconomy.mjs';
import type { CombatantDnd35e } from '@documents/combat/combatant/CombatantDnd35e.mjs';
import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';
import { buildActionEconomyWarningCard, buildItemActionSpentCard } from '@source/dice/index.mjs';

import type { PhysicalItem, PhysicalItemSystemData } from '../index.mjs';

const ITEM_STOWED_EVENT = 'itemStowed';
const ITEM_RETRIEVED_EVENT = 'itemRetrieved';

interface StowedItemPayload {
  item: PhysicalItem;
  containerUuid: string | null;
  /** `system.containerUuid` immediately before this update — lets Undo restore the exact prior container (or null). */
  priorContainerUuid: string | null;
  /** Set when this update is itself an Undo-button revert — the action-economy listener below no-ops on this to avoid re-spending. */
  isUndo?: boolean;
  sourceMsg?: string;
  sourceActorId?: string;
}

interface StowedItemEvent extends DocumentEvent {
  type: typeof ITEM_STOWED_EVENT | typeof ITEM_RETRIEVED_EVENT;
  payload: StowedItemPayload;
}

interface CheckForStowedItemEventParams {
  parent: PhysicalItem;
  updateData: Record<string, unknown>;
  sourceMsg?: string;
  sourceActorId?: string;
  isUndo?: boolean;
}

// this is for an item to see if it has been stowed in or retrieved from a container, and to fire the appropriate event
const checkForStowedItemEvent: EventChecker<StowedItemPayload> = (
  { parent, updateData, ...payloadMetaData }: CheckForStowedItemEventParams
) => {
  const result: EventCheckResult<StowedItemPayload> = {
    documentId: parent.id,
    event: ITEM_STOWED_EVENT,
    result: false,
    args: [],
  };

  const updateSystem = updateData.system as Partial<PhysicalItemSystemData> | undefined;
  if (!updateSystem || !('containerUuid' in updateSystem)) {
    return result;
  }

  const containerUuid = updateSystem.containerUuid ?? null;
  const eventType = containerUuid ? ITEM_STOWED_EVENT : ITEM_RETRIEVED_EVENT;

  result.event = eventType;
  result.result = true;
  result.payload = {
    item: parent,
    containerUuid,
    // `parent` still reflects pre-update state here — this checker runs from `_preUpdate`,
    // before `updateData` is applied to the document.
    priorContainerUuid: parent.system.containerUuid,
    isUndo: payloadMetaData.isUndo,
    sourceMsg: payloadMetaData.sourceMsg,
    sourceActorId: payloadMetaData.sourceActorId,
  };

  return result;
};

export type {
  CheckForStowedItemEventParams,
  StowedItemEvent,
  StowedItemPayload,
};

export {
  checkForStowedItemEvent,
  ITEM_RETRIEVED_EVENT,
  ITEM_STOWED_EVENT,
  registerStowActionEconomyListener,
};

/**
 * Spends a move action whenever a physical item is stowed in or retrieved from a
 * container mid-combat (SRD "Manipulate an Item": retrieving or putting away a stored
 * item) — always a plain move action, no BAB-based free-action exception (unlike the
 * weapon draw/shield ready rule in equippableItem/events/equipped.mts). No-ops outside
 * an active combat, or if the item's parent actor has no combatant in the current
 * encounter. Posts a warning card if the combatant has no move action left to spend, or
 * an Action Spent card (with Undo) when the spend succeeds.
 */
async function spendStowMoveAction (item: PhysicalItem, isStowing: boolean, priorContainerUuid: string | null): Promise<void> {
  if (!game.combat?.started) return;
  const actor = item.actor;
  if (!actor) return;
  const combatant = game.combat.getCombatantsByActor(actor.id)[0] as CombatantDnd35e | undefined;
  if (!combatant) return;

  const spent = await spendAction(combatant, [ACTION_ECONOMY.MOVE]);
  if (!spent) {
    const messageKey = isStowing
      ? 'dnd35e.ROLL.ACTION_WARNING_CARD.InsufficientMoveStow'
      : 'dnd35e.ROLL.ACTION_WARNING_CARD.InsufficientMoveRetrieve';
    await buildActionEconomyWarningCard(combatant, actor as ActorDnd35e, game.i18n.format(messageKey, { name: combatant.name, item: item.name }));
    return;
  }

  const actionLabelKey = isStowing
    ? 'dnd35e.ROLL.ITEM_ACTION_SPENT_CARD.Stowed'
    : 'dnd35e.ROLL.ITEM_ACTION_SPENT_CARD.Retrieved';
  await buildItemActionSpentCard(combatant, actor as ActorDnd35e, game.i18n.format(actionLabelKey, { item: item.name }), spent, {
    itemUuid: item.uuid,
    revert: { kind: 'stow', priorContainerUuid },
  });
}

/** Subscribes the item to its own stow/retrieve lifecycle events (see `spendStowMoveAction`). */
function registerStowActionEconomyListener (item: PhysicalItem): void {
  item.events.on<StowedItemEvent>(ITEM_STOWED_EVENT, (event) => {
    if (event.payload.isUndo) return;
    void spendStowMoveAction(item, true, event.payload.priorContainerUuid);
  });
  item.events.on<StowedItemEvent>(ITEM_RETRIEVED_EVENT, (event) => {
    if (event.payload.isUndo) return;
    void spendStowMoveAction(item, false, event.payload.priorContainerUuid);
  });
}
