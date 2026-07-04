import type { HpData } from '@actors/creature/data/CreatureSystemData.mjs';
import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';
import { getActorDeathThreshold } from '@settings/combat/index.mjs';

import type { Creature } from '../index.mjs';

const DYING_EVENT = 'dying';
const NO_LONGER_DYING_EVENT = 'noLongerDying';

/** Payload for the `dying` actor event. */
interface DyingPayload {
  isDying: boolean;
  newHp: number;
  previousHp: number;
  deathThreshold: number;
  sourceMsg?: string;
  sourceActorId?: string;
}

interface DyingEvent extends DocumentEvent {
  type: typeof DYING_EVENT;
  payload: DyingPayload;
}

interface checkForDyingEventParams {
  parent: Creature;
  updateData: Record<string, unknown>;
  sourceMsg?: string;
  sourceActorId?: string;
}

/**
 * Fires when a creature crosses into or out of the dying window (HP < 0, above death threshold).
 * `isDying: true`  — entered the dying window (HP dropped from ≥ 0 into the negative range).
 * `isDying: false` — left the dying window (healed back to ≥ 0, or dropped further to death).
 */
const checkForDyingEvent: EventChecker<DyingPayload> = (
  { parent, updateData, ...payloadMetaData }: checkForDyingEventParams
) => {
  const result: EventCheckResult<DyingPayload> = {
    documentId: parent.id,
    event: DYING_EVENT,
    result: false,
    args: [],
  } as const;

  const updateSystem = updateData.system as { hp?: Partial<HpData> } | undefined;
  if (updateSystem?.hp?.current === undefined) {
    return result;
  }

  const oldHp = parent.system.hp;
  const newCurrentHp = updateSystem.hp.current;
  const deathThreshold = getActorDeathThreshold(parent);

  const wasInDyingWindow = oldHp.current < 0 && oldHp.current > deathThreshold;
  const isNowInDyingWindow = newCurrentHp < 0 && newCurrentHp > deathThreshold;

  let isDying: boolean | null = null;
  if (!wasInDyingWindow && isNowInDyingWindow) isDying = true;
  if (wasInDyingWindow && !isNowInDyingWindow) isDying = false;

  if (isDying === null) {
    return result;
  }

  result.event = isDying
    ? DYING_EVENT
    : NO_LONGER_DYING_EVENT;
  result.result = true;
  result.payload = {
    isDying,
    newHp: newCurrentHp,
    previousHp: oldHp.current,
    deathThreshold,
    ...payloadMetaData,
  };

  return result;
};

export type { DyingEvent, DyingPayload };
export { checkForDyingEvent, DYING_EVENT, NO_LONGER_DYING_EVENT };
