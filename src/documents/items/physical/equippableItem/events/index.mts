import type { EquippableItem } from '../EquippableItem.mjs';
import { checkForEquippedItemEvent, ITEM_EQUIPPED_EVENT } from './equipped.mjs';

const registerEquippableEventChecks = (item: EquippableItem) => {
  item.events.registerChangeEventCheck(ITEM_EQUIPPED_EVENT, checkForEquippedItemEvent);
};

export { registerEquippableEventChecks };
