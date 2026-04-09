import { EquippableItem } from '@items/components/Equippable/index.mjs';
import type { PhysicalItemSourceProps } from '@items/components/Physical/index.mjs';
import { WeaponItemType } from '@items/itemTypes.mjs';

import type { WeaponSystemData, WeaponSystemSource } from './data/WeaponSystemData.mjs';

type WeaponSource = Omit<foundry.documents.ItemSource, 'system'>
  & Omit<PhysicalItemSourceProps, 'system'>
  & { system: WeaponSystemSource; };

class Weapon extends EquippableItem {
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

type WeaponType = Weapon;

export {
  Weapon,
};

export type {
  WeaponSource,
  WeaponType,
};
