import type { PhysicalItem } from '../PhysicalItem.mjs';
import { ADJUST_ITEM_HP_EVENT, checkForAdjustItemDamageEvent } from './adjustItemDamage.mjs';
import { checkForItemBrokenEvent, ITEM_BROKEN_EVENT } from './broken.mjs';
import { checkForItemDamageTakenEvent, ITEM_DAMAGED_EVENT } from './itemDamageTaken.mjs';
import { checkForStowedItemEvent, ITEM_STOWED_EVENT, registerStowActionEconomyListener } from './stowed.mjs';

const registerPhysicalItemEventChecks = (item: PhysicalItem) => {
  item.events.registerChangeEventCheck(ADJUST_ITEM_HP_EVENT, checkForAdjustItemDamageEvent);
  item.events.registerChangeEventCheck(ITEM_DAMAGED_EVENT, checkForItemDamageTakenEvent);
  item.events.registerChangeEventCheck(ITEM_BROKEN_EVENT, checkForItemBrokenEvent);
  item.events.registerChangeEventCheck(ITEM_STOWED_EVENT, checkForStowedItemEvent);
  registerStowActionEconomyListener(item);
};

export { registerPhysicalItemEventChecks };
