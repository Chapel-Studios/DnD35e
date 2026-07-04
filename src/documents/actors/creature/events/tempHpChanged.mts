import type { HpData } from '@actors/creature/data/CreatureSystemData.mjs';
import { HP_ADJUSTMENT_TYPE, type HpAdjustmentType } from '@actors/creature/sheet/components/constants.mjs';
import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';

import type { Creature } from '../index.mjs';

const TEMP_HP_CHANGED_EVENT = 'tempHpChanged';

/** Payload for the `tempHpChanged` actor event. Only fires when called through the HP adjuster. */
interface TempHpChangedPayload {
  amount: number;
  previousHp: HpData;
  newHp: HpData;
  sourceDocumentId?: string;
  sourceMessage?: string;
}

interface TempHpChangedEvent extends DocumentEvent {
  type: typeof TEMP_HP_CHANGED_EVENT;
  payload: TempHpChangedPayload;
}

interface checkForTempHpChangedEventParams {
  parent: Creature;
  updateData: Record<string, unknown>;
  hpAdjustmentType?: HpAdjustmentType;
  adjustmentAmount?: number;
  sourceDocumentId?: string;
  sourceMessage?: string;
}

/**
 * Fires when a creature's temporary HP changes via the HP adjuster.
 * Does NOT fire on direct character-sheet HP edits (no hpAdjustmentType metadata).
 */
const checkForTempHpChangedEvent: EventChecker<TempHpChangedPayload> = (
  { parent, updateData, hpAdjustmentType, adjustmentAmount, sourceDocumentId, sourceMessage }: checkForTempHpChangedEventParams
) => {
  const result: EventCheckResult<TempHpChangedPayload> = {
    documentId: parent.id,
    event: TEMP_HP_CHANGED_EVENT,
    result: false,
    args: [],
  } as const;

  if (hpAdjustmentType !== HP_ADJUSTMENT_TYPE.TEMPORARY_ADJUSTMENT) {
    return result;
  }

  const updateSystem = updateData.system as { hp?: Partial<HpData> } | undefined;
  if (updateSystem?.hp?.temp === undefined) {
    return result;
  }

  const previousHp = parent.system.hp;
  const newHp = { ...previousHp, ...updateSystem.hp } as HpData;

  result.result = true;
  result.payload = {
    amount: adjustmentAmount ?? 0,
    previousHp,
    newHp,
    sourceDocumentId,
    sourceMessage,
  };

  return result;
};

export type { TempHpChangedEvent, TempHpChangedPayload };
export { checkForTempHpChangedEvent, TEMP_HP_CHANGED_EVENT };
