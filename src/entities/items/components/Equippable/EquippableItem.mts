import type { ItemDnd35e, ItemSourceDnd35e } from '@items/baseItem/index.mjs';
import type { PhysicalItem, PhysicalItemSourceProps } from '@items/components/Physical/index.mjs';
import { applyPhysicalPrototype } from '@items/components/Physical/index.mjs';
import type { ItemType } from '@items/index.mjs';

import type { EquippableItemSystemData, EquippableItemSystemSource } from './index.mjs';

type EquippableItemSourceProps = {
  system: EquippableItemSystemSource;
}

type EquippableItemSource<TItemType extends ItemType = ItemType> =
  Omit<ItemSourceDnd35e<TItemType>, 'system'>
    & PhysicalItemSourceProps
    & EquippableItemSourceProps;

interface EquippableItem {
  system: EquippableItemSystemData;
}

type EquippableItemLike = ItemDnd35e<ItemType>
  & PhysicalItem
  & EquippableItem;

const applyEquippablePrototype = <T extends typeof ItemDnd35e<ItemType>> (item: T) => {
  applyPhysicalPrototype(item);
  // applyDamagableRuntime(item);
};

const equippableOverrides = {
  // displayName: physicalOverrides.displayName,
};

export {
  applyEquippablePrototype,
  equippableOverrides,
};

export type {
  EquippableItem,
  EquippableItemLike,
  EquippableItemSource,
  EquippableItemSourceProps,
};
