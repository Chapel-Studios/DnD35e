import type { Creature } from '../index.mjs';
import { ADJUST_HP_EVENT, checkForAdjustHpEvent } from './adjustHp.mjs';
import { BLOODIED_EVENT, checkForBloodiedEvent } from './bloodied.mjs';
import { checkForDamageTakenEvent, DAMAGE_TAKEN_EVENT } from './damageTaken.mjs';
import { checkForDeathEvent, DEATH_EVENT } from './death.mjs';
import { checkForDisabledViaHealthEvent, DISABLED_VIA_HEALTH_EVENT } from './disabledViaHealth.mjs';
import { checkForDyingEvent, DYING_EVENT } from './dying.mjs';
import { checkForHealingReceivedEvent, HEALING_RECEIVED_EVENT } from './healingReceived.mjs';
import { checkForNonlethalTakenEvent, NONLETHAL_TAKEN_EVENT } from './nonlethalTaken.mjs';
import { checkForStaggeredFromNonLethalEvent, STAGGERED_FROM_NONLETHAL_EVENT } from './staggeredFromNonLethal.mjs';
import { checkForTempHpChangedEvent, TEMP_HP_CHANGED_EVENT } from './tempHpChanged.mjs';
import { checkForUnconsciousFromNonLethalEvent, UNCONSCIOUS_FROM_NONLETHAL_EVENT } from './unconsciousFromNonLethal.mjs';

const registerCreatureEventChecks = (creature: Creature) => {
  creature.events.registerChangeEventCheck(ADJUST_HP_EVENT, checkForAdjustHpEvent);
  creature.events.registerChangeEventCheck(BLOODIED_EVENT, checkForBloodiedEvent);
  // adjustment-type-gated events (only fire when called through the HP adjuster)
  creature.events.registerChangeEventCheck(DAMAGE_TAKEN_EVENT, checkForDamageTakenEvent);
  creature.events.registerChangeEventCheck(HEALING_RECEIVED_EVENT, checkForHealingReceivedEvent);
  creature.events.registerChangeEventCheck(NONLETHAL_TAKEN_EVENT, checkForNonlethalTakenEvent);
  creature.events.registerChangeEventCheck(TEMP_HP_CHANGED_EVENT, checkForTempHpChangedEvent);
  // threshold/state transition events
  creature.events.registerChangeEventCheck(DEATH_EVENT, checkForDeathEvent);
  creature.events.registerChangeEventCheck(DYING_EVENT, checkForDyingEvent);
  creature.events.registerChangeEventCheck(DISABLED_VIA_HEALTH_EVENT, checkForDisabledViaHealthEvent);
  creature.events.registerChangeEventCheck(STAGGERED_FROM_NONLETHAL_EVENT, checkForStaggeredFromNonLethalEvent);
  creature.events.registerChangeEventCheck(UNCONSCIOUS_FROM_NONLETHAL_EVENT, checkForUnconsciousFromNonLethalEvent);
};

export {
  registerCreatureEventChecks,
};
