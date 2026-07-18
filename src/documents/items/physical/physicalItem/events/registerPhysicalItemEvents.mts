import { DocumentEventEmitter } from '@helpers/documentEvents/DocumentEventEmitter.mjs';

import { PhysicalItemLifeCycle } from './PhysicalItemLifeCycle.mjs';

const registerPhysicalItemEvents = () => {
  DocumentEventEmitter.registerEventType(PhysicalItemLifeCycle.hpAdjusted, {
    label: 'dnd35e.PHYSICAL_ITEM.EVENTS.hpAdjusted.label',
    description: 'dnd35e.PHYSICAL_ITEM.EVENTS.hpAdjusted.description',
    appliesTo: ['Item'],
  });
  DocumentEventEmitter.registerEventType(PhysicalItemLifeCycle.damageTaken, {
    label: 'dnd35e.PHYSICAL_ITEM.EVENTS.damageTaken.label',
    description: 'dnd35e.PHYSICAL_ITEM.EVENTS.damageTaken.description',
    appliesTo: ['Item'],
  });
  DocumentEventEmitter.registerEventType(PhysicalItemLifeCycle.damageMended, {
    label: 'dnd35e.PHYSICAL_ITEM.EVENTS.damageMended.label',
    description: 'dnd35e.PHYSICAL_ITEM.EVENTS.damageMended.description',
    appliesTo: ['Item'],
  });
  DocumentEventEmitter.registerEventType(PhysicalItemLifeCycle.itemBroken, {
    label: 'dnd35e.PHYSICAL_ITEM.EVENTS.itemBroken.label',
    description: 'dnd35e.PHYSICAL_ITEM.EVENTS.itemBroken.description',
    appliesTo: ['Item'],
  });
  DocumentEventEmitter.registerEventType(PhysicalItemLifeCycle.itemRepaired, {
    label: 'dnd35e.PHYSICAL_ITEM.EVENTS.itemRepaired.label',
    description: 'dnd35e.PHYSICAL_ITEM.EVENTS.itemRepaired.description',
    appliesTo: ['Item'],
  });
};

export { registerPhysicalItemEvents };
