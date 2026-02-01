import { ItemDnd35e, ItemSourceDnd35e } from '@items/baseItem/index.mjs';
import { DamagableItemSystemData } from './data/index.mjs';
import { ItemType } from '@items/index.mjs';

interface DamagableItemSourceProps {
  system: DamagableItemSystemData;
};

type DamagableItemSource<TItemType extends ItemType = ItemType> = 
  Omit<ItemSourceDnd35e<TItemType>, "system">
    & DamagableItemSourceProps;

interface DamagableItem {
  system: DamagableItemSystemData;

  get unidentifiedDisplayName(): string;
  get identifiedDisplayName(): string;
};

type DamagableItemLike =
  ItemDnd35e<ItemType> &
  DamagableItem;

const applyDamagableRuntime = (item: { system: any }) => {
}

export {
  applyDamagableRuntime,
};

export type {
  DamagableItemSourceProps,
  DamagableItemSource,
  DamagableItem,
  DamagableItemLike,
};
