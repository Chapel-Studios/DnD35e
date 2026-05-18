import type { ItemSystemData } from '@items/baseItem/index.mjs';
import type { EquippableItemSystemData } from '@items/components/Equippable/index.mjs';

import type { WeaponBaseType, WeaponSubtype, WeaponType } from './index.mjs';

type WeaponDamage = {
  damageRoll: string;
  damageType: string;
  critRange: string;
  critMultiplier: number;
  rangeIncrement: number;
  attackFormula: string;
  damageFormula: string;
};

interface WeaponSystemSource {
  isBaseWeaponType: boolean;
  isMasterwork: boolean;
  weaponType: WeaponType;
  weaponSubtype: WeaponSubtype;
  weaponBaseType: WeaponBaseType;
  weaponDamage: WeaponDamage;
  attackNotes: string;
  damageNotes: string;
  noAmmoRequired: boolean;
}

type WeaponSystemData = WeaponSystemSource
  & ItemSystemData
  & EquippableItemSystemData;

export type {
  WeaponDamage,
  WeaponSystemData,
  WeaponSystemSource,
};
