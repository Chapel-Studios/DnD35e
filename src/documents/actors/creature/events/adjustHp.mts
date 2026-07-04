import type { HpData } from '@actors/creature/data/CreatureSystemData.mjs';
import type { HpAdjustmentType } from '@actors/creature/sheet/components/constants.mjs';
import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';

import type { Creature } from '../index.mjs';

const ADJUST_HP_EVENT = 'adjustHp';

interface AdjustHpPayload {
  adjustedHp: HpData;
  amount: number;
  hpAdjustmentType: HpAdjustmentType;
  sourceMsg?: string;
  sourceActorId?: string;
}

interface AdjustHpEvent extends DocumentEvent {
  type: typeof ADJUST_HP_EVENT;
  payload: AdjustHpPayload;
}

// interface fireAdjustHpEventParams {
//   emitter: DocumentEventEmitter<any>;
//   adjustedHp: HpData;
//   amount: number;
//   hpAdjustmentType: HpAdjustmentType;
//   sourceMsg?: string;
//   sourceActorId?: string;
// }

interface checkForAdjustHpEventParams {
  parent: Creature;
  updateData: Record<string, unknown>;
  hpAdjustmentType?: HpAdjustmentType;
  adjustmentAmount?: number;
  sourceMsg?: string;
  sourceActorId?: string;
}

const checkForAdjustHpEvent: EventChecker<AdjustHpPayload> = (
  { parent, updateData, ...payloadMetaData }: checkForAdjustHpEventParams
) => {
  const result: EventCheckResult<AdjustHpPayload> = {
    documentId: parent.id,
    event: ADJUST_HP_EVENT,    
    result: false,
    args: [],
  } as const;

  const updateSystem = updateData.system as { hp?: Partial<HpData> } | undefined;
  if (!updateSystem?.hp) {
    return result;
  }

  const parentHp = parent.system.hp;
  const adjustedHp = { ...parentHp, ...updateSystem.hp };

  result.result = true;
  result.payload = {
    ...payloadMetaData,
    adjustedHp,
  } as AdjustHpPayload;

  return result;
};

// // NOTE: Taking damage is not the same as having HP adjusted.
// const fireAdjustHpEvent = ({
//   emitter,
//   ...eventParams
// }: fireAdjustHpEventParams): void => {
//   emitter.emit(ADJUST_HP_EVENT, {
//     ...eventParams,
//   } as AdjustHpPayload);
// };

export type {
  AdjustHpEvent,
  AdjustHpPayload,
  // fireAdjustHpEventParams,
};

export {
  ADJUST_HP_EVENT,
  checkForAdjustHpEvent,
  // fireAdjustHpEvent,
};
