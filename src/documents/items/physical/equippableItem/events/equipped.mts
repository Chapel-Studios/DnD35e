import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';

import type { EquippableItem, EquippableItemSystemData } from '../index.mjs';

const ITEM_EQUIPPED_EVENT = 'itemEquipped';
const ITEM_UNEQUIPPED_EVENT = 'itemUnequipped';

interface EquippedItemPayload {
  item: EquippableItem;
  slotIds: string[];
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
    sourceMsg: payloadMetaData.sourceMsg,
    sourceActorId: payloadMetaData.sourceActorId,
  };

  return result;
};

export type {
  CheckForEquippedItemEventParams,
  EquippedItemEvent,
  EquippedItemPayload,
};

export {
  checkForEquippedItemEvent,
  ITEM_EQUIPPED_EVENT,
  ITEM_UNEQUIPPED_EVENT,
};
