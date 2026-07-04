import { ADJUST_HP_EVENT } from './adjustHp.mjs';
import { BLOODIED_EVENT, UNBLOODIED_EVENT } from './bloodied.mjs';
import { DAMAGE_TAKEN_EVENT } from './damageTaken.mjs';
import { DEATH_EVENT, NO_LONGER_DEAD_EVENT } from './death.mjs';
import { DISABLED_VIA_HEALTH_EVENT, RECOVERED_FROM_DISABLED_VIA_HEALTH_EVENT } from './disabledViaHealth.mjs';
import { DYING_EVENT, NO_LONGER_DYING_EVENT } from './dying.mjs';
import { HEALING_RECEIVED_EVENT } from './healingReceived.mjs';
import { NONLETHAL_TAKEN_EVENT } from './nonlethalTaken.mjs';
import { NO_LONGER_STAGGERED_FROM_NONLETHAL_EVENT, STAGGERED_FROM_NONLETHAL_EVENT } from './staggeredFromNonLethal.mjs';
import { TEMP_HP_CHANGED_EVENT } from './tempHpChanged.mjs';
import { NO_LONGER_UNCONSCIOUS_FROM_NONLETHAL_EVENT, UNCONSCIOUS_FROM_NONLETHAL_EVENT } from './unconsciousFromNonLethal.mjs';

const CreatureLifeCycle = {
  // HP Change Events
  /** Creature HP adjusted (damage, healing, temp HP, nonlethal). Payload: {@link AdjustHpPayload} */
  hpAdjusted: ADJUST_HP_EVENT,
  /** Creature took damage. Payload: {@link DamageTakenPayload} */
  damageTaken: DAMAGE_TAKEN_EVENT,
  /** Creature became bloodied. Payload: {@link BloodiedPayload} */
  bloodied: BLOODIED_EVENT,
  /** Creature is no longer bloodied. Payload: {@link UnbloodiedPayload} */
  unbloodied: UNBLOODIED_EVENT,
  /** Creature received healing. Payload: {@link HealingReceivedPayload} */
  healingReceived: HEALING_RECEIVED_EVENT,
  /** Creature took nonlethal damage. Payload: {@link NonlethalTakenPayload} */
  nonlethalTaken: NONLETHAL_TAKEN_EVENT,
  /** Creature's temporary HP changed. Payload: {@link TempHpChangedPayload} */
  tempHpChanged: TEMP_HP_CHANGED_EVENT,
  // Death and Dying
  /** Creature was disabled via health. Payload: {@link DisabledViaHealthPayload} */
  disabledViaHealth: DISABLED_VIA_HEALTH_EVENT,
  /** Creature recovered from being disabled via health. Payload: {@link RecoveredFromDisabledViaHealthPayload} */
  recoveredFromDisabledViaHealth: RECOVERED_FROM_DISABLED_VIA_HEALTH_EVENT,
  /** Creature is dying. Payload: {@link DyingPayload} */
  dying: DYING_EVENT,
  /** Creature is no longer dying. Payload: {@link NoLongerDyingPayload} */
  noLongerDying: NO_LONGER_DYING_EVENT,
  /** Creature died. Payload: {@link DiedPayload} */
  died: DEATH_EVENT,
  /** Creature is no longer dead. Payload: {@link NoLongerDeadPayload} */
  noLongerDead: NO_LONGER_DEAD_EVENT,
  // Non-lethal state transitions
  /** Creature is staggered from nonlethal damage. Payload: {@link StaggeredFromNonLethalPayload} */
  staggeredFromNonLethal: STAGGERED_FROM_NONLETHAL_EVENT,
  /** Creature is no longer staggered from nonlethal damage. Payload: {@link NoLongerStaggeredFromNonLethalPayload} */
  noLongerStaggeredFromNonLethal: NO_LONGER_STAGGERED_FROM_NONLETHAL_EVENT,
  /** Creature is unconscious from nonlethal damage. Payload: {@link UnconsciousFromNonLethalPayload} */
  unconsciousFromNonLethal: UNCONSCIOUS_FROM_NONLETHAL_EVENT,
  /** Creature is no longer unconscious from nonlethal damage. Payload: {@link NoLongerUnconsciousFromNonLethalPayload} */
  noLongerUnconsciousFromNonLethal: NO_LONGER_UNCONSCIOUS_FROM_NONLETHAL_EVENT,
};

export {
  CreatureLifeCycle,
};
