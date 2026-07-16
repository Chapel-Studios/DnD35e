import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';

import type { ItemHpSource } from '../data/PhysicalItemSystemData.mjs';
import type { PhysicalItem } from '../index.mjs';

const ITEM_DAMAGED_EVENT = 'itemDamaged';
const ITEM_MENDED_EVENT = 'itemMended';

interface ItemDamageTakenPayload {
  previousHp: ItemHpSource;
  newHp: ItemHpSource;
  amount: number;
  damageType?: string;
  sourceMsg?: string;
  sourceActorId?: string;
}

interface ItemDamageTakenEvent extends DocumentEvent {
  type: (typeof ITEM_DAMAGED_EVENT) | (typeof ITEM_MENDED_EVENT);
  payload: ItemDamageTakenPayload;
}

interface CheckForItemDamageTakenEventParams {
  parent: PhysicalItem;
  updateData: Record<string, unknown>;
  amount?: number;
  damageType?: string;
  sourceMsg?: string;
  sourceActorId?: string;
}

const checkForItemDamageTakenEvent: EventChecker<ItemDamageTakenPayload> = (
  { parent, updateData, ...payloadMetaData }: CheckForItemDamageTakenEventParams
) => {
  const result: EventCheckResult<ItemDamageTakenPayload> = {
    documentId: parent.id,
    event: ITEM_DAMAGED_EVENT,    
    result: false,
    args: [],
  } as const;

  const updateSystem = updateData.system as { hp?: Partial<ItemHpSource> } | undefined;
  if (!updateSystem?.hp) {
    return result;
  }

  const previousHp = parent.system.hp;
  const newHp = { ...previousHp, ...updateSystem.hp } as ItemHpSource;

  result.result = true;
  result.payload = {
    amount: payloadMetaData.amount ?? 0,
    previousHp,
    newHp,
    damageType: payloadMetaData.damageType,
    sourceMsg: payloadMetaData.sourceMsg,
    sourceActorId: payloadMetaData.sourceActorId,
  };
  if (newHp.current > previousHp.current) {
    result.event = ITEM_MENDED_EVENT;
  }

  return result;
};

export type { ItemDamageTakenEvent, ItemDamageTakenPayload };
export {
  checkForItemDamageTakenEvent,
  ITEM_DAMAGED_EVENT,
  ITEM_MENDED_EVENT,
};
