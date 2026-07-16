import { DocumentEventEmitter } from '@helpers/documentEvents/DocumentEventEmitter.mjs';

import { EquippableItemLifeCycle } from './EquippableItemLifeCycle.mjs';

const registerEquippableEvents = () => {
  DocumentEventEmitter.registerEventType(EquippableItemLifeCycle.equipped, {
    label: 'dnd35e.EQUIPPABLE_ITEM.EVENTS.itemEquipped.label',
    description: 'dnd35e.EQUIPPABLE_ITEM.EVENTS.itemEquipped.description',
    appliesTo: ['Item'],
  });
  DocumentEventEmitter.registerEventType(EquippableItemLifeCycle.unequipped, {
    label: 'dnd35e.EQUIPPABLE_ITEM.EVENTS.itemUnequipped.label',
    description: 'dnd35e.EQUIPPABLE_ITEM.EVENTS.itemUnequipped.description',
    appliesTo: ['Item'],
  });
};

export {
  registerEquippableEvents,
};
