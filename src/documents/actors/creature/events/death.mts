import type { HpData } from '@actors/creature/data/CreatureSystemData.mjs';
import type { DocumentEvent, EventChecker, EventCheckResult } from '@helpers/documentEvents/types.mjs';
import { getActorDeathThreshold } from '@settings/combat/index.mjs';

import type { Creature } from '../index.mjs';

const DEATH_EVENT = 'death';
const NO_LONGER_DEAD_EVENT = 'noLongerDead';

interface DeathPayload {
  newHp: number;
  previousHp: number;
  deathThreshold: number;
  sourceMsg?: string;
  sourceActorId?: string;
  isDead: boolean;
}

interface DeathEvent extends DocumentEvent {
  type: typeof DEATH_EVENT;
  payload: DeathPayload;
}

interface checkForDeathEventParams {
  parent: Creature;
  updateData: Record<string, unknown>;
  sourceMsg?: string;
  sourceActorId?: string;
}

/**
 * Fires when a creature crosses the death threshold in either direction.
 * `isDead: true`  — HP dropped to ≤ threshold (entering dead state).
 * `isDead: false` — HP rose above threshold (leaving dead state, e.g. resurrection).
 */
const checkForDeathEvent: EventChecker<DeathPayload> = (
  { parent, updateData, ...payloadMetaData }: checkForDeathEventParams
) => {
  const result: EventCheckResult<DeathPayload> = {
    documentId: parent.id,
    event: DEATH_EVENT,
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

  let isDead: boolean | null = null;
  if (oldHp.current > deathThreshold && newCurrentHp <= deathThreshold) isDead = true;
  if (oldHp.current <= deathThreshold && newCurrentHp > deathThreshold) isDead = false;

  if (isDead === null) {
    return result;
  }

  result.event = isDead
    ? DEATH_EVENT
    : NO_LONGER_DEAD_EVENT;
  result.result = true;
  result.payload = {
    isDead,
    newHp: newCurrentHp,
    previousHp: oldHp.current,
    deathThreshold,
    ...payloadMetaData,
  };

  return result;
};

export type { DeathEvent, DeathPayload };
export { checkForDeathEvent, DEATH_EVENT, NO_LONGER_DEAD_EVENT };
