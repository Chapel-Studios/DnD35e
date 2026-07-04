import { ADJUST_HP_EVENT } from './events/adjustHp.mjs';
import { CreatureLifeCycle } from './events/CreatureLifeCycle.mjs';
import type { DamageTakenPayload } from './events/damageTaken.mjs';
import type { DeathPayload } from './events/death.mjs';
import type { DisabledViaHealthPayload } from './events/disabledViaHealth.mjs';
import type { DyingPayload } from './events/dying.mjs';
import type { HealingReceivedPayload } from './events/healingReceived.mjs';
import type { NonlethalTakenPayload } from './events/nonlethalTaken.mjs';
import type { StaggeredFromNonLethalPayload } from './events/staggeredFromNonLethal.mjs';
import type { TempHpChangedPayload } from './events/tempHpChanged.mjs';
import type { UnconsciousFromNonLethalPayload } from './events/unconsciousFromNonLethal.mjs';
import type { Creature } from './index.mjs';

const _debugCreature = (creature: Creature) => {
  creature.events.on(ADJUST_HP_EVENT, (payload) => {
    console.log('Creature adjustHp event fired', payload);
  });
  creature.events.on(CreatureLifeCycle.bloodied, (payload) => {
    console.log('Creature bloodied event fired', payload);
  });
  creature.events.on(CreatureLifeCycle.damageTaken, (payload: DamageTakenPayload) => {
    // TODO[statuses]: future hook point for damage reactions (DR, retaliation, etc.)
    console.log('[dnd35e] DAMAGE TAKEN', creature.name, payload);
  });
  creature.events.on(CreatureLifeCycle.healingReceived, (payload: HealingReceivedPayload) => {
    // TODO[statuses]: future hook point for healing reactions
    console.log('[dnd35e] HEALING RECEIVED', creature.name, payload);
  });
  creature.events.on(CreatureLifeCycle.nonlethalTaken, (payload: NonlethalTakenPayload) => {
    console.log('[dnd35e] NONLETHAL TAKEN', creature.name, payload);
  });
  creature.events.on(CreatureLifeCycle.tempHpChanged, (payload: TempHpChangedPayload) => {
    console.log('[dnd35e] TEMP HP CHANGED', creature.name, payload);
  });
  creature.events.on(CreatureLifeCycle.died, (payload: DeathPayload) => {
    // TODO[statuses]: set or remove 'dead' status based on payload.isDead
    console.log('[dnd35e] DEATH', creature.name, payload.isDead ? 'ENTERED' : 'LEFT', payload);
  });
  creature.events.on(CreatureLifeCycle.dying, (payload: DyingPayload) => {
    // TODO[statuses]: set or remove 'dying' status based on payload.isDying
    console.log('[dnd35e] DYING', creature.name, payload.isDying ? 'ENTERED' : 'LEFT', payload);
  });
  creature.events.on(CreatureLifeCycle.disabledViaHealth, (payload: DisabledViaHealthPayload) => {
    // TODO[statuses]: set or remove 'disabled' status based on payload.isDisabled
    console.log('[dnd35e] DISABLED', creature.name, payload.isDisabled ? 'ENTERED' : 'LEFT', payload);
  });
  creature.events.on(CreatureLifeCycle.staggeredFromNonLethal, (payload: StaggeredFromNonLethalPayload) => {
    // TODO[statuses]: set or remove 'staggered' status based on payload.isStaggered
    console.log('[dnd35e] STAGGERED (NL)', creature.name, payload.isStaggered ? 'ENTERED' : 'LEFT', payload);
  });
  creature.events.on(CreatureLifeCycle.unconsciousFromNonLethal, (payload: UnconsciousFromNonLethalPayload) => {
    // TODO[statuses]: set or remove 'unconscious' status based on payload.isUnconscious
    console.log('[dnd35e] UNCONSCIOUS (NL)', creature.name, payload.isUnconscious ? 'ENTERED' : 'LEFT', payload);
  });
};

const isCreatureDebugEnabled = false;

export { _debugCreature, isCreatureDebugEnabled };
