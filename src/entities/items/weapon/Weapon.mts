import { EquippableItem } from '@items/components/Equippable/index.mjs';
import type { PhysicalItemSourceProps } from '@items/components/Physical/index.mjs';
import type { WeaponItemType } from '@items/itemTypes.mjs';

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
  // [1.G] Move to EquippableItem as a real getter. Two header status components:
  //   - PhysicalItemHeaderStatus.vue: checks isCarried, shows "Carried" badge
  //   - EquippableHeaderStatus.vue: overrides physical, checks isEquipped (priority) + isCarried
  // get equippedStatusLabel() {
  //   if (!this.parent) {
  //     return '';
  //   }

  //   return this.system.isEquipped
  //     ? 'D35E.Equipped'
  //     : 'dnd35e.COMMON.NotEquipped';
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
