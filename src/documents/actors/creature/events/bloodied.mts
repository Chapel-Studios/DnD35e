import type { DocumentDnd35e } from '@documents/document/DocumentDnd35e.mjs';
import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';

import type { CreatureSystemData } from '../index.mjs';
import { HP_ADJUSTMENT_TYPE } from '../sheet/components/constants.mjs';
import type { AdjustHpPayload } from './adjustHp.mjs';

const BLOODIED_EVENT = 'bloodied';
const UNBLOODIED_EVENT = 'unbloodied';

interface BloodiedPayload extends AdjustHpPayload {
  isBloodied: boolean;
}

interface BloodiedEvent extends DocumentEvent {
  type: typeof BLOODIED_EVENT;
  payload: BloodiedPayload;
}

interface checkForBloodiedEventParams {
  parent: DocumentDnd35e<any>;
  updateData: Record<string, unknown>;
  sourceActorId?: string;
  sourceMsg?: string;
}

const checkForBloodiedEvent: EventChecker<BloodiedPayload> = (
  { parent, updateData, ...payloadMetaData }: checkForBloodiedEventParams
) => {
  const updateSystem = updateData.system as CreatureSystemData;
  const result: EventCheckResult<BloodiedPayload> = {
    event: BLOODIED_EVENT,
    documentId: parent.id,
    result: false,
    args: [],    
  };
  // Cancel if updateData does not contain a system.hp.current property
  if ((updateData.system as CreatureSystemData)?.hp?.current === undefined) {
    return result;
  }

  const oldHp = parent.system.hp;
  const halfMaxHp = Math.floor(oldHp.max / 2);
  let bloodiedUpdate = null;

  if (oldHp.current <= halfMaxHp && updateSystem.hp.current > halfMaxHp) {
    bloodiedUpdate = false;
  }
  if (oldHp.current > halfMaxHp && updateSystem.hp.current <= halfMaxHp) {
    bloodiedUpdate = true;
  }
  
  if (bloodiedUpdate === null) {
    return result;
  }

  const hpAdjustmentType = updateSystem.hp.current > oldHp.current
    ? HP_ADJUSTMENT_TYPE.HEALING_ADJUSTMENT
    : HP_ADJUSTMENT_TYPE.DAMAGE_ADJUSTMENT;
  
  result.event = bloodiedUpdate
    ? BLOODIED_EVENT
    : UNBLOODIED_EVENT;
  result.result = true;
  result.args = [bloodiedUpdate];
  result.payload = {
    adjustedHp: updateSystem.hp,
    amount: updateSystem.hp.current - oldHp.current,
    hpAdjustmentType,
    isBloodied: bloodiedUpdate,
    ...payloadMetaData,
  } as BloodiedPayload;
  
  return result;
};

// const fireBloodiedEvent = ({
//   emitter,
//   ...eventParams
// }: fireAdjustHpEventParams): void => {
//   const isBloodied = eventParams.adjustedHp.current <= Math.floor(eventParams.adjustedHp.max / 2);
//   emitter.emit(BLOODIED_EVENT, {
//     ...eventParams,
//     isBloodied,
//   } as BloodiedPayload);
// };

export {
  BLOODIED_EVENT,
  checkForBloodiedEvent,
  UNBLOODIED_EVENT,
  // fireBloodiedEvent,
};

export type {
  BloodiedEvent,
  BloodiedPayload,
};