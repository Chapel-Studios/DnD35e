import { ADJUST_ITEM_HP_EVENT } from './adjustItemDamage.mjs';
import { ITEM_BROKEN_EVENT, ITEM_REPAIRED_EVENT } from './broken.mjs';
import { ITEM_DAMAGED_EVENT, ITEM_MENDED_EVENT } from './itemDamageTaken.mjs';

const PhysicalItemLifeCycle = {
  /** Item HP adjusted Payload: {@link ItemHpChangedPayload} */
  hpAdjusted: ADJUST_ITEM_HP_EVENT,
  /** Item took damage. Payload: {@link ItemDamageTakenPayload} */
  damageTaken: ITEM_DAMAGED_EVENT,
  /** Item was mended. Payload: {@link ItemDamageTakenPayload} */
  damageMended: ITEM_MENDED_EVENT,
  /** Item took damage and is now broken. Payload: {@link ItemBrokenPayload} */
  itemBroken: ITEM_BROKEN_EVENT,
  /** Item was repaired. Payload: {@link ItemDamageTakenPayload} */
  itemRepaired: ITEM_REPAIRED_EVENT,
} as const;

export { PhysicalItemLifeCycle };
