import type { WeaponItemType } from '@items/itemTypes.mjs';
import { EquippableItem } from '@items/physical/equippableItem/index.mjs';
import type { PhysicalItemSourceProps } from '@items/physical/physicalItem/index.mjs';

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
}

type WeaponType = Weapon;

export {
  Weapon,
};

export type {
  WeaponSource,
  WeaponType,
};
