import type { HpData } from '@actors/creature/data/CreatureSystemData.mjs';
import { HP_ADJUSTMENT_TYPE, type HpAdjustmentType } from '@actors/creature/sheet/components/constants.mjs';
import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';

import type { Creature } from '../index.mjs';

const DAMAGE_TAKEN_EVENT = 'damageTaken';

/** Payload for the `damageTaken` actor event. Only fires when called through the HP adjuster. */
interface DamageTakenPayload {
  amount: number;
  previousHp: HpData;
  newHp: HpData;
  damageType?: string;
  sourceDocumentId?: string;
  sourceMessage?: string;
}

interface DamageTakenEvent extends DocumentEvent {
  type: typeof DAMAGE_TAKEN_EVENT;
  payload: DamageTakenPayload;
}

interface checkForDamageTakenEventParams {
  parent: Creature;
  updateData: Record<string, unknown>;
  hpAdjustmentType?: HpAdjustmentType;
  adjustmentAmount?: number;
  damageType?: string;
  sourceDocumentId?: string;
  sourceMessage?: string;
}

/**
 * Fires when a creature takes lethal damage via the HP adjuster.
 * Does NOT fire on direct character-sheet HP edits (no hpAdjustmentType metadata).
 */
const checkForDamageTakenEvent: EventChecker<DamageTakenPayload> = (
  { parent, updateData, hpAdjustmentType, adjustmentAmount, damageType, sourceDocumentId, sourceMessage }: checkForDamageTakenEventParams
) => {
  const result: EventCheckResult<DamageTakenPayload> = {
    documentId: parent.id,
    event: DAMAGE_TAKEN_EVENT,
    result: false,
    args: [],
  } as const;

  if (hpAdjustmentType !== HP_ADJUSTMENT_TYPE.DAMAGE_ADJUSTMENT) {
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
    damageType,
    sourceDocumentId,
    sourceMessage,
  };

  return result;
};

export type { DamageTakenEvent, DamageTakenPayload };
export { checkForDamageTakenEvent, DAMAGE_TAKEN_EVENT };
