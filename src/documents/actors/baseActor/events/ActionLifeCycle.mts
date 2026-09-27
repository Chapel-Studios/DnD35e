import { DEAL_DAMAGE_EVENT } from './dealDamage.mjs';
import { POST_USE_ACTION_EVENT } from './postUseAction.mjs';
import { PRE_USE_ACTION_EVENT } from './preUseAction.mjs';
import { UNDO_DEAL_DAMAGE_EVENT } from './undoDealDamage.mjs';

/** Action-execution lifecycle events (poc.10 §10.7) — shared by every `ActorDnd35e` subtype. */
const ActionLifeCycle = {
  /** Before an action executes. Cancellable. Payload: {@link PreUseActionPayload} */
  preUseAction: PRE_USE_ACTION_EVENT,
  /** After an action completes. Payload: {@link PostUseActionPayload} */
  postUseAction: POST_USE_ACTION_EVENT,
  /** Damage applied to a target's HP as part of posting a Resolution card. Payload: {@link DealDamagePayload} */
  dealDamage: DEAL_DAMAGE_EVENT,
  /** A Resolution card's Undo reversed a prior `dealDamage`. Payload: {@link UndoDealDamagePayload} */
  undoDealDamage: UNDO_DEAL_DAMAGE_EVENT,
} as const;

export { ActionLifeCycle };
