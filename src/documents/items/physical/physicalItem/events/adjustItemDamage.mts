import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';

import type { ItemHpSource } from '../data/PhysicalItemSystemData.mjs';
import type { PhysicalItemSystemData } from '../index.mjs';
import type { PhysicalItem } from '../PhysicalItem.mjs';

const ADJUST_ITEM_HP_EVENT = 'adjustItemDamage';

interface AdjustItemDamagePayload {
  adjustedHp: ItemHpSource;
  amount: number;
  sourceMsg?: string;
  sourceActorId?: string;
}

interface AdjustItemDamageEvent extends DocumentEvent {
  type: typeof ADJUST_ITEM_HP_EVENT;
  payload: AdjustItemDamagePayload;
}

interface CheckForAdjustItemDamageEventParams {
  parent: PhysicalItem;
  updateData: Record<string, unknown>;
  amount?: number;
  sourceMsg?: string;
  sourceActorId?: string;
}

const checkForAdjustItemDamageEvent: EventChecker<AdjustItemDamagePayload> = (
  { parent, updateData, ...payloadMetaData }: CheckForAdjustItemDamageEventParams
) => {
  const result: EventCheckResult<AdjustItemDamagePayload> = {
    documentId: parent.id,
    event: ADJUST_ITEM_HP_EVENT,    
    result: false,
    args: [],
  } as const;

  const updateSystem = updateData.system as PhysicalItemSystemData | undefined;
  if (
    typeof updateSystem?.hp?.current !== 'number'
    && typeof updateSystem?.hp?.max !== 'number'
  ) {
    return result;
  }

  result.result = true;
  result.payload = {
    adjustedHp: {
      current: updateSystem?.hp?.current ?? parent.system.hp.current,
      max: updateSystem?.hp?.max ?? parent.system.hp.max,
    },
    amount: payloadMetaData.amount ?? 0,
    sourceMsg: payloadMetaData.sourceMsg,
    sourceActorId: payloadMetaData.sourceActorId,
  };

  return result;
};

export type {
  AdjustItemDamageEvent,
  AdjustItemDamagePayload,
  CheckForAdjustItemDamageEventParams,
};

export {
  ADJUST_ITEM_HP_EVENT,
  checkForAdjustItemDamageEvent,
};
