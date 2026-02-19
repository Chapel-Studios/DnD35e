import { ItemDnd35e, ItemSourceDnd35e } from '@items/baseItem/index.mjs';
import { applyPhysicalPrototype, PhysicalItemLike, PhysicalItemSourceProps } from '@items/components/Physical/index.mjs';
import { WeaponItemType } from '@items/itemTypes.mjs';

import { WeaponSystemData, WeaponSystemSource } from './index.mjs';

type WeaponSource = Omit<ItemSourceDnd35e, 'system'>
  & Omit<PhysicalItemSourceProps, 'system'>
  & { system: WeaponSystemSource; };

class Weapon extends ItemDnd35e<WeaponItemType> {
  declare system: WeaponSystemData;
  declare type: WeaponItemType;

  override prepareBaseData (): void {
    super.prepareBaseData();
  }
  // This needs to go to equippable
  // get equippedStatusLabel() {
  //   if (!this.parent) {
  //     return '';
  //   }

  //   return this.system.isEquipped
  //     ? 'D35E.Equipped'
  //     : 'D35E.NotEquipped';
  // }
}

applyPhysicalPrototype(Weapon);

type WeaponType = Weapon & PhysicalItemLike;

export {
  Weapon,
};

export type {
  WeaponSource,
  WeaponType,
};
