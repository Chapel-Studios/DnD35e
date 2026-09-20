import { DocumentEventEmitter } from '@helpers/documentEvents/DocumentEventEmitter.mjs';

import { ActionLifeCycle } from './ActionLifeCycle.mjs';

const registerActionEvents = () => {
  DocumentEventEmitter.registerEventType(ActionLifeCycle.preUseAction, {
    label: 'dnd35e.ACTOR.EVENTS.preUseAction.label',
    description: 'dnd35e.ACTOR.EVENTS.preUseAction.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(ActionLifeCycle.postUseAction, {
    label: 'dnd35e.ACTOR.EVENTS.postUseAction.label',
    description: 'dnd35e.ACTOR.EVENTS.postUseAction.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(ActionLifeCycle.dealDamage, {
    label: 'dnd35e.ACTOR.EVENTS.dealDamage.label',
    description: 'dnd35e.ACTOR.EVENTS.dealDamage.description',
    appliesTo: ['Actor'],
  });
  DocumentEventEmitter.registerEventType(ActionLifeCycle.undoDealDamage, {
    label: 'dnd35e.ACTOR.EVENTS.undoDealDamage.label',
    description: 'dnd35e.ACTOR.EVENTS.undoDealDamage.description',
    appliesTo: ['Actor'],
  });
};

export { registerActionEvents };
