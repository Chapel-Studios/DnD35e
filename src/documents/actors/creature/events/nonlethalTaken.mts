import type { HpData } from '@actors/creature/data/CreatureSystemData.mjs';
import { HP_ADJUSTMENT_TYPE, type HpAdjustmentType } from '@actors/creature/sheet/components/constants.mjs';
import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';

import type { Creature } from '../index.mjs';

const NONLETHAL_TAKEN_EVENT = 'nonlethalTaken';

/** Payload for the `nonlethalTaken` actor event. Only fires when called through the HP adjuster. */
interface NonlethalTakenPayload {
  amount: number;
  previousHp: HpData;
  newHp: HpData;
  sourceDocumentId?: string;
  sourceMessage?: string;
}

interface NonlethalTakenEvent extends DocumentEvent {
  type: typeof NONLETHAL_TAKEN_EVENT;
  payload: NonlethalTakenPayload;
}

interface checkForNonlethalTakenEventParams {
  parent: Creature;
  updateData: Record<string, unknown>;
  hpAdjustmentType?: HpAdjustmentType;
  adjustmentAmount?: number;
  sourceDocumentId?: string;
  sourceMessage?: string;
}

/**
 * Fires when a creature takes nonlethal damage via the HP adjuster.
 * Does NOT fire on direct character-sheet HP edits (no hpAdjustmentType metadata).
 */
const checkForNonlethalTakenEvent: EventChecker<NonlethalTakenPayload> = (
  { parent, updateData, hpAdjustmentType, adjustmentAmount, sourceDocumentId, sourceMessage }: checkForNonlethalTakenEventParams
) => {
  const result: EventCheckResult<NonlethalTakenPayload> = {
    documentId: parent.id,
    event: NONLETHAL_TAKEN_EVENT,
    result: false,
    args: [],
  } as const;

  if (hpAdjustmentType !== HP_ADJUSTMENT_TYPE.NONLETHAL_ADJUSTMENT) {
    return result;
  }

  const updateSystem = updateData.system as { hp?: Partial<HpData> } | undefined;
  if (updateSystem?.hp?.nonlethal === undefined) {
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

export type { NonlethalTakenEvent, NonlethalTakenPayload };
export { checkForNonlethalTakenEvent, NONLETHAL_TAKEN_EVENT };
