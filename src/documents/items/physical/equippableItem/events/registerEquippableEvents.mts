import { DocumentEventEmitter } from '@helpers/documentEvents/DocumentEventEmitter.mjs';

import { EquippableItemLifeCycle } from './EquippableItemLifeCycle.mjs';

const registerEquippableEvents = () => {
  DocumentEventEmitter.registerEventType(EquippableItemLifeCycle.equipped, {
    label: 'dnd35e.EQUIPPABLE.EVENTS.itemEquipped.label',
    description: 'dnd35e.EQUIPPABLE.EVENTS.itemEquipped.description',
    appliesTo: ['Item'],
  });
  DocumentEventEmitter.registerEventType(EquippableItemLifeCycle.unequipped, {
    label: 'dnd35e.EQUIPPABLE.EVENTS.itemUnequipped.label',
    description: 'dnd35e.EQUIPPABLE.EVENTS.itemUnequipped.description',
    appliesTo: ['Item'],
  });
};

export {
  registerEquippableEvents,
};
