import { ItemDnd35e, ItemSourceDnd35e } from '@items/baseItem/index.mjs';
import { applyIdentifiablePrototype, IdentifiableItemSourceProps, identifiableOverrides } from '../Identifiable/IdentifiableItem.mjs';
import { PhysicalItemSystemData, PhysicalItemSystemSource } from './index.mjs';
import { ItemType } from '@items/itemTypes.mjs';

type PhysicalItemSourceProps = {
  system: PhysicalItemSystemSource;
}

type PhysicalItemSource<TItemType extends ItemType = ItemType> =
  Omit<ItemSourceDnd35e<TItemType>, 'system'>
    & IdentifiableItemSourceProps
    & PhysicalItemSourceProps;

interface PhysicalItem {
  system: PhysicalItemSystemData;

  get unidentifiedDisplayName(): string;
  get identifiedDisplayName(): string;
}

type PhysicalItemLike = ItemDnd35e<ItemType>
  & PhysicalItem;

const applyPhysicalPrototype = <T extends typeof ItemDnd35e<ItemType>> (item: T) => {
  applyIdentifiablePrototype(item);
  // applyDamagableRuntime(item);
};

const physicalOverrides = {
  displayName: identifiableOverrides.displayName,
};

export {
  applyPhysicalPrototype,
  physicalOverrides,
};

export type {
  PhysicalItemSourceProps,
  PhysicalItemSource,
  PhysicalItem,
  PhysicalItemLike,
};
