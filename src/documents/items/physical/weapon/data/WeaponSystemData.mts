import type { WeaponAction } from '@items/baseItem/actions/types.mjs';
import type { ItemSystemData } from '@items/baseItem/index.mjs';
import type { EquippableItemSystemData } from '@items/physical/equippableItem/index.mjs';

import type { WeaponBaseType, WeaponSubtype, WeaponType } from './index.mjs';



interface WeaponSystemSource {
  isBaseWeaponType: boolean;
  weaponType: WeaponType;
  weaponSubtype: WeaponSubtype;
  weaponBaseType: WeaponBaseType;
  actions: WeaponAction[];
}

type WeaponSystemData = WeaponSystemSource
  & ItemSystemData
  & EquippableItemSystemData;

export type {
  WeaponSystemData,
  WeaponSystemSource,
};
