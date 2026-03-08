import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { PhysicalItemSourceProps } from '@items/components/Physical/index.mjs';
import { PhysicalItem } from '@items/components/Physical/index.mjs';
import type { ItemType } from '@items/index.mjs';

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
