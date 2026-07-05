import type { EquipSlot } from '@constants/equipmentSlots.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/index.mjs';

import type { PhysicalItemSourceProps } from '../physicalItem/PhysicalItem.mjs';
import { PhysicalItem } from '../physicalItem/PhysicalItem.mjs';
import type { EquippableItemSystemData, EquippableItemSystemSource } from './index.mjs';

type EquippableItemSourceProps = {
  system: EquippableItemSystemSource;
}

type EquippableItemSource<TItemType extends ItemType = ItemType> =
  Omit<foundry.documents.ItemSource<TItemType>, 'system'>
    & PhysicalItemSourceProps
    & EquippableItemSourceProps;

/**
 * Abstract base for all equippable items.
 * Inherits physical + identifiable behaviour from {@link PhysicalItem}.
 */
abstract class EquippableItem extends PhysicalItem {
  declare system: EquippableItemSystemData;

  abstract performEquip(slotIds: EquipSlot[]): Promise<void> | void;
}

type EquippableItemLike = ItemDnd35e<ItemType> & EquippableItem;

export {
  EquippableItem,
};

export type {
  EquippableItemLike,
  EquippableItemSource,
  EquippableItemSourceProps,
};
