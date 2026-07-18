import { ITEM_EQUIPPED_EVENT, ITEM_UNEQUIPPED_EVENT } from './equipped.mjs';

const EquippableItemLifeCycle = {
  /** Item equipped. Payload: {@link EquippedItemPayload} */
  equipped: ITEM_EQUIPPED_EVENT,
  /** Item unequipped. Payload: {@link EquippedItemPayload} */
  unequipped: ITEM_UNEQUIPPED_EVENT,
} as const;

export {
  EquippableItemLifeCycle,
};
