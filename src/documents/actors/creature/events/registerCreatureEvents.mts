import { DocumentEventEmitter } from '@helpers/index.mjs';

import { CreatureLifeCycle } from './CreatureLifeCycle.mjs';

const registerCreatureEvents = () => {
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.hpAdjusted, {
    label: 'dnd35e.CREATURE.EVENTS.hpAdjusted.label',
    description: 'dnd35e.CREATURE.EVENTS.hpAdjusted.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.damageTaken, {
    label: 'dnd35e.CREATURE.EVENTS.damageTaken.label',
    description: 'dnd35e.CREATURE.EVENTS.damageTaken.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.bloodied, {
    label: 'dnd35e.CREATURE.EVENTS.bloodied.label',
    description: 'dnd35e.CREATURE.EVENTS.bloodied.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.unbloodied, {
    label: 'dnd35e.CREATURE.EVENTS.unbloodied.label',
    description: 'dnd35e.CREATURE.EVENTS.unbloodied.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.healingReceived, {
    label: 'dnd35e.CREATURE.EVENTS.healingReceived.label',
    description: 'dnd35e.CREATURE.EVENTS.healingReceived.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.nonlethalTaken, {
    label: 'dnd35e.CREATURE.EVENTS.nonlethalTaken.label',
    description: 'dnd35e.CREATURE.EVENTS.nonlethalTaken.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.tempHpChanged, {
    label: 'dnd35e.CREATURE.EVENTS.tempHpChanged.label',
    description: 'dnd35e.CREATURE.EVENTS.tempHpChanged.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.disabledViaHealth, {
    label: 'dnd35e.CREATURE.EVENTS.disabledViaHealth.label',
    description: 'dnd35e.CREATURE.EVENTS.disabledViaHealth.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.recoveredFromDisabledViaHealth, {
    label: 'dnd35e.CREATURE.EVENTS.recoveredFromDisabledViaHealth.label',
    description: 'dnd35e.CREATURE.EVENTS.recoveredFromDisabledViaHealth.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.dying, {
    label: 'dnd35e.CREATURE.EVENTS.dying.label',
    description: 'dnd35e.CREATURE.EVENTS.dying.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.noLongerDying, {
    label: 'dnd35e.CREATURE.EVENTS.noLongerDying.label',
    description: 'dnd35e.CREATURE.EVENTS.noLongerDying.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.died, {
    label: 'dnd35e.CREATURE.EVENTS.died.label',
    description: 'dnd35e.CREATURE.EVENTS.died.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.noLongerDead, {
    label: 'dnd35e.CREATURE.EVENTS.noLongerDead.label',
    description: 'dnd35e.CREATURE.EVENTS.noLongerDead.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.staggeredFromNonLethal, {
    label: 'dnd35e.CREATURE.EVENTS.staggeredFromNonLethal.label',
    description: 'dnd35e.CREATURE.EVENTS.staggeredFromNonLethal.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.noLongerStaggeredFromNonLethal, {
    label: 'dnd35e.CREATURE.EVENTS.noLongerStaggeredFromNonLethal.label',
    description: 'dnd35e.CREATURE.EVENTS.noLongerStaggeredFromNonLethal.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.unconsciousFromNonLethal, {
    label: 'dnd35e.CREATURE.EVENTS.unconsciousFromNonLethal.label',
    description: 'dnd35e.CREATURE.EVENTS.unconsciousFromNonLethal.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(CreatureLifeCycle.noLongerUnconsciousFromNonLethal, {
    label: 'dnd35e.CREATURE.EVENTS.noLongerUnconsciousFromNonLethal.label',
    description: 'dnd35e.CREATURE.EVENTS.noLongerUnconsciousFromNonLethal.description',
    appliesTo: ['Actor'],
  });
// DocumentEventEmitter.registerEventType(CreatureLifeCycle.revealSecret, {
//   label: 'dnd35e.CREATURE.EVENTS.revealSecret.label',
//   description: 'dnd35e.CREATURE.EVENTS.revealSecret.description',
//   appliesTo: ['Actor'],
// });
};

export { registerCreatureEvents };
