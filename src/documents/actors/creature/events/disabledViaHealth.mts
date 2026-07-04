import type { HpData } from '@actors/creature/data/CreatureSystemData.mjs';
import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';

import type { Creature } from '../index.mjs';

const DISABLED_VIA_HEALTH_EVENT = 'disabledViaHealth';
const RECOVERED_FROM_DISABLED_VIA_HEALTH_EVENT = 'recoveredFromDisabledViaHealth';

/** Payload for the `disabledViaHealth` actor event (HP at exactly 0). */
interface DisabledViaHealthPayload {
  isDisabled: boolean;
  previousHp: number;
  sourceMsg?: string;
  sourceActorId?: string;
}

interface DisabledViaHealthEvent extends DocumentEvent {
  type: typeof DISABLED_VIA_HEALTH_EVENT;
  payload: DisabledViaHealthPayload;
}

interface checkForDisabledViaHealthEventParams {
  parent: Creature;
  updateData: Record<string, unknown>;
  sourceMsg?: string;
  sourceActorId?: string;
}

/**
 * Fires when a creature crosses into or out of the disabled state (HP exactly 0).
 * `isDisabled: true`  — HP dropped to exactly 0 from positive (entering disabled).
 * `isDisabled: false` — HP left 0 in either direction (healed or took further damage).
 */
const checkForDisabledViaHealthEvent: EventChecker<DisabledViaHealthPayload> = (
  { parent, updateData, ...payloadMetaData }: checkForDisabledViaHealthEventParams
) => {
  const result: EventCheckResult<DisabledViaHealthPayload> = {
    documentId: parent.id,
    event: DISABLED_VIA_HEALTH_EVENT,
    result: false,
    args: [],
  } as const;

  const updateSystem = updateData.system as { hp?: Partial<HpData> } | undefined;
  if (updateSystem?.hp?.current === undefined) {
    return result;
  }

  const oldHp = parent.system.hp;
  const newCurrentHp = updateSystem.hp.current;

  let isDisabled: boolean | null = null;
  if (oldHp.current !== 0 && newCurrentHp === 0) isDisabled = true;
  if (oldHp.current === 0 && newCurrentHp !== 0) isDisabled = false;

  if (isDisabled === null) {
    return result;
  }

  result.event = isDisabled
    ? DISABLED_VIA_HEALTH_EVENT
    : RECOVERED_FROM_DISABLED_VIA_HEALTH_EVENT;
  result.result = true;
  result.payload = {
    isDisabled,
    previousHp: oldHp.current,
    ...payloadMetaData,
  };

  return result;
};

export type { DisabledViaHealthEvent, DisabledViaHealthPayload };
export { checkForDisabledViaHealthEvent, DISABLED_VIA_HEALTH_EVENT, RECOVERED_FROM_DISABLED_VIA_HEALTH_EVENT };
