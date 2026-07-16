import { findAllBrokenAes, syncBrokenAeState } from '@effects/material/logic/brokenAe.mjs';
import type { DocumentEvent, EventCheckResult } from '@helpers/documentEvents/types.mjs';

import type { PhysicalItem } from '../index.mjs';
import type { ItemDamageTakenPayload } from './itemDamageTaken.mjs';

const ITEM_BROKEN_EVENT = 'itemBroken';
const ITEM_REPAIRED_EVENT = 'itemRepaired';

interface ItemBrokenPayload  extends ItemDamageTakenPayload {
  isBroken: boolean;
}

interface ItemBrokenEvent extends DocumentEvent {
  type: typeof ITEM_BROKEN_EVENT;
  payload: ItemBrokenPayload;
}

interface CheckForItemBrokenEventParams {
  parent: PhysicalItem;
  updateData: Record<string, unknown>;
  sourceActorId?: string;
  sourceMsg?: string;
}

const checkForItemBrokenEvent: (params: CheckForItemBrokenEventParams) => EventCheckResult<ItemBrokenPayload> = (
  { parent, updateData, ...payloadMetaData }: CheckForItemBrokenEventParams
) => {
  const result: EventCheckResult<ItemBrokenPayload> = {
    documentId: parent.id,
    event: ITEM_BROKEN_EVENT,
    result: false,
    args: [],
  } as const;

  const updateSystem = updateData.system as { hp?: Partial<{ current: number; max: number }> } | undefined;
  if (!updateSystem?.hp) {
    return result;
  }
  const previousHp = parent.system.hp;
  const newHp = { ...previousHp, ...updateSystem.hp };

  const newBrokenState = newHp.current <= 0 && newHp.max > 0;
  result.result = true;
  result.payload = {
    previousHp,
    newHp,
    amount: (previousHp.current - newHp.current),
    isBroken: newBrokenState,
    sourceMsg: payloadMetaData.sourceMsg,
    sourceActorId: payloadMetaData.sourceActorId,
  };

  const wasBroken = findAllBrokenAes(parent).some((ae) => !ae.disabled);
  if (wasBroken !== newBrokenState) {
    queueMicrotask(async () => {
      await syncBrokenAeState(parent, newBrokenState);
    });
  }
  
  return result;
};

export type { ItemBrokenEvent, ItemBrokenPayload };
export {
  checkForItemBrokenEvent,
  ITEM_BROKEN_EVENT,
  ITEM_REPAIRED_EVENT,
};
