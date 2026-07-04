import type { HpData } from '@actors/creature/data/CreatureSystemData.mjs';
import { HP_ADJUSTMENT_TYPE, type HpAdjustmentType } from '@actors/creature/sheet/components/constants.mjs';
import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';

import type { Creature } from '../index.mjs';

const HEALING_RECEIVED_EVENT = 'healingReceived';

/** Payload for the `healingReceived` actor event. Only fires when called through the HP adjuster. */
interface HealingReceivedPayload {
  amount: number;
  previousHp: HpData;
  newHp: HpData;
  sourceDocumentId?: string;
  sourceMessage?: string;
}

interface HealingReceivedEvent extends DocumentEvent {
  type: typeof HEALING_RECEIVED_EVENT;
  payload: HealingReceivedPayload;
}

interface checkForHealingReceivedEventParams {
  parent: Creature;
  updateData: Record<string, unknown>;
  hpAdjustmentType?: HpAdjustmentType;
  adjustmentAmount?: number;
  sourceDocumentId?: string;
  sourceMessage?: string;
}

/**
 * Fires when a creature receives healing via the HP adjuster.
 * Nonlethal removed by healing is reflected in newHp.nonlethal vs. previousHp.nonlethal.
 * Does NOT fire on direct character-sheet HP edits (no hpAdjustmentType metadata).
 */
const checkForHealingReceivedEvent: EventChecker<HealingReceivedPayload> = (
  { parent, updateData, hpAdjustmentType, adjustmentAmount, sourceDocumentId, sourceMessage }: checkForHealingReceivedEventParams
) => {
  const result: EventCheckResult<HealingReceivedPayload> = {
    documentId: parent.id,
    event: HEALING_RECEIVED_EVENT,
    result: false,
    args: [],
  } as const;

  if (hpAdjustmentType !== HP_ADJUSTMENT_TYPE.HEALING_ADJUSTMENT) {
    return result;
  }

  const updateSystem = updateData.system as { hp?: Partial<HpData> } | undefined;
  if (!updateSystem?.hp) {
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

export type { HealingReceivedEvent, HealingReceivedPayload };
export { checkForHealingReceivedEvent, HEALING_RECEIVED_EVENT };
