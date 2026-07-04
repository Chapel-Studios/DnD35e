import type { HpData } from '@actors/creature/data/CreatureSystemData.mjs';
import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';

import type { Creature } from '../index.mjs';

const STAGGERED_FROM_NONLETHAL_EVENT = 'staggeredFromNonLethal';
const NO_LONGER_STAGGERED_FROM_NONLETHAL_EVENT = 'noLongerStaggeredFromNonLethal';

/** Payload for the `staggeredFromNonLethal` actor event. */
interface StaggeredFromNonLethalPayload {
  isStaggered: boolean;
  currentHp: number;
  nonlethal: number;
  sourceMsg?: string;
  sourceActorId?: string;
}

interface StaggeredFromNonLethalEvent extends DocumentEvent {
  type: typeof STAGGERED_FROM_NONLETHAL_EVENT;
  payload: StaggeredFromNonLethalPayload;
}

interface checkForStaggeredFromNonLethalEventParams {
  parent: Creature;
  updateData: Record<string, unknown>;
  sourceMsg?: string;
  sourceActorId?: string;
}

/**
 * Fires when a creature crosses into or out of the nonlethal staggered state.
 * Per RAW (SRD Injury and Death): nonlethal damage equals current HP = staggered;
 * nonlethal damage exceeds current HP = unconscious (separate event).
 *
 * `isStaggered: true`  — entering staggered (nonlethal reached current HP).
 * `isStaggered: false` — leaving staggered: either current HP rose above nonlethal,
 *                        or nonlethal fell below current, or nonlethal crossed into unconscious.
 *
 * The `nonlethal > 0` guard prevents triggering when both values are 0
 * (disabled condition at HP=0 is handled separately by disabledViaHealth).
 *
 * Can trigger from either nonlethal damage increasing or current HP decreasing.
 */
const checkForStaggeredFromNonLethalEvent: EventChecker<StaggeredFromNonLethalPayload> = (
  { parent, updateData, ...payloadMetaData }: checkForStaggeredFromNonLethalEventParams
) => {
  const result: EventCheckResult<StaggeredFromNonLethalPayload> = {
    documentId: parent.id,
    event: STAGGERED_FROM_NONLETHAL_EVENT,
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

  const wasStaggered = oldHp.nonlethal === oldHp.current && oldHp.nonlethal > 0;
  const isNowStaggered = newNonlethal === newCurrentHp && newNonlethal > 0;

  let isStaggered: boolean | null = null;
  if (!wasStaggered && isNowStaggered) isStaggered = true;
  if (wasStaggered && !isNowStaggered) isStaggered = false;

  if (isStaggered === null) {
    return result;
  }

  result.event = isStaggered
    ? STAGGERED_FROM_NONLETHAL_EVENT
    : NO_LONGER_STAGGERED_FROM_NONLETHAL_EVENT;
  result.result = true;
  result.payload = {
    isStaggered,
    currentHp: newCurrentHp,
    nonlethal: newNonlethal,
    ...payloadMetaData,
  };

  return result;
};

export type { StaggeredFromNonLethalEvent, StaggeredFromNonLethalPayload };
export {
  checkForStaggeredFromNonLethalEvent,
  NO_LONGER_STAGGERED_FROM_NONLETHAL_EVENT,
  STAGGERED_FROM_NONLETHAL_EVENT,
};
