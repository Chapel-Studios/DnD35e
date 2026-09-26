import type { UseActionContext } from '@items/baseItem/actions/types.mjs';

import type { ActorDnd35e } from '../index.mjs';

const DEAL_DAMAGE_EVENT = 'dealDamage';

/**
 * Emitted when damage is actually applied to a target's HP as part of posting a
 * Resolution card (poc.10 §10.7) — never at the point damage is merely rolled.
 */
interface DealDamagePayload {
  amount: number;
  damageType: string;
  target: ActorDnd35e;
  context?: UseActionContext;
}

export { DEAL_DAMAGE_EVENT };
export type { DealDamagePayload };
