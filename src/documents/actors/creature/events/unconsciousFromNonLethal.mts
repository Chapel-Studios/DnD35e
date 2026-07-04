import type { HpData } from '@actors/creature/data/CreatureSystemData.mjs';
import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';

import type { Creature } from '../index.mjs';

const UNCONSCIOUS_FROM_NONLETHAL_EVENT = 'unconsciousFromNonLethal';
const NO_LONGER_UNCONSCIOUS_FROM_NONLETHAL_EVENT = 'noLongerUnconsciousFromNonLethal';

/** Payload for the `unconsciousFromNonLethal` actor event. */
interface UnconsciousFromNonLethalPayload {
  isUnconscious: boolean;
  currentHp: number;
  nonlethal: number;
  sourceMsg?: string;
  sourceActorId?: string;
}

interface UnconsciousFromNonLethalEvent extends DocumentEvent {
  type: typeof UNCONSCIOUS_FROM_NONLETHAL_EVENT;
  payload: UnconsciousFromNonLethalPayload;
}

interface checkForUnconsciousFromNonLethalEventParams {
  parent: Creature;
  updateData: Record<string, unknown>;
  sourceMsg?: string;
  sourceActorId?: string;
}

/**
 * Fires when a creature crosses into or out of nonlethal unconsciousness (nonlethal strictly exceeds current HP).
 * Per RAW: nonlethal === current HP = staggered; nonlethal > current HP = unconscious.
 * `isUnconscious: true`  — entering nonlethal unconsciousness.
 * `isUnconscious: false` — leaving nonlethal unconsciousness (healed or nonlethal reduced).
 * Can trigger from either nonlethal damage increasing or current HP decreasing.
 */
const checkForUnconsciousFromNonLethalEvent: EventChecker<UnconsciousFromNonLethalPayload> = (
  { parent, updateData, ...payloadMetaData }: checkForUnconsciousFromNonLethalEventParams
) => {
  const result: EventCheckResult<UnconsciousFromNonLethalPayload> = {
    documentId: parent.id,
    event: UNCONSCIOUS_FROM_NONLETHAL_EVENT,
    result: false,
    args: [],
  } as const;

  const updateSystem = updateData.system as { hp?: Partial<HpData> } | undefined;
  if (!updateSystem?.hp) {
    return result;
  }

  const oldHp = parent.system.hp;
  const newCurrentHp = updateSystem.hp.current ?? oldHp.current;
  const newNonlethal = updateSystem.hp.nonlethal ?? oldHp.nonlethal;

  const wasUnconscious = oldHp.nonlethal > oldHp.current;
  const isNowUnconscious = newNonlethal > newCurrentHp;

  let isUnconscious: boolean | null = null;
  if (!wasUnconscious && isNowUnconscious) isUnconscious = true;
  if (wasUnconscious && !isNowUnconscious) isUnconscious = false;

  if (isUnconscious === null) {
    return result;
  }

  result.event = isUnconscious
    ? UNCONSCIOUS_FROM_NONLETHAL_EVENT
    : NO_LONGER_UNCONSCIOUS_FROM_NONLETHAL_EVENT;
  result.result = true;
  result.payload = {
    isUnconscious,
    currentHp: newCurrentHp,
    nonlethal: newNonlethal,
    ...payloadMetaData,
  };

  return result;
};

export type { UnconsciousFromNonLethalEvent, UnconsciousFromNonLethalPayload };
export {
  checkForUnconsciousFromNonLethalEvent,
  NO_LONGER_UNCONSCIOUS_FROM_NONLETHAL_EVENT,
  UNCONSCIOUS_FROM_NONLETHAL_EVENT,
};
