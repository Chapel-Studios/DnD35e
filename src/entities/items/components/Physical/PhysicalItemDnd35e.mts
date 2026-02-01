import { ItemDnd35e, ItemSourceDnd35e } from '@items/baseItem/index.mjs';
import { applyDamagableRuntime, DamagableItemSourceProps } from '../Damagable/DamagableItem.mjs';
import { applyIdentifiablePrototype, IdentifiableItemSourceProps, identifiableOverrides } from '../Identifiable/IdentifiableItem.mjs';
import { PhysicalItemSystemData, PhysicalItemSystemSource } from './index.mjs';
import { ItemType } from '@items/itemTypes.mjs';

type PhysicalItemSourceProps = {
  system: PhysicalItemSystemSource;
}

type PhysicalItemSource<TItemType extends ItemType = ItemType> = 
  Omit<ItemSourceDnd35e<TItemType>, "system">
    & IdentifiableItemSourceProps
    & DamagableItemSourceProps
    & PhysicalItemSourceProps;

interface PhysicalItem {
  system: PhysicalItemSystemData;

  get unidentifiedDisplayName(): string;
  get identifiedDisplayName(): string;
};

type PhysicalItemLike =
  ItemDnd35e<ItemType> &
  PhysicalItem;

const applyPhysicalPrototype = <T extends typeof ItemDnd35e<ItemType>> (item: T) => {
  applyIdentifiablePrototype(item);
  // applyDamagableRuntime(item);

};

const physicalOverrides = {
  displayName: identifiableOverrides.displayName,
};

// override _createFreshSystemData (): PhysicalSystemData {
//   return {
//     ...super._createFreshSystemData(),
//     ...createIdentifiableSystemData(),
//     quantity: 1,
//     weight: 0,
//     isWeightlessInContainer: false,
//     isWeightlessWhenCarried: false,
//     isCarried: false,
//     size: 'tiny',
//     price: 0,
//     resalePrice: null,
//     brokenResalePrice: null,
//     isFullResalePrice: false,
//     containerId: null,
//   };
// }

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
