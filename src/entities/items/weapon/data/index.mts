import type {
  WeaponBaseType,
  WeaponSubtype,
  WeaponType,
} from './constants.mjs';
import {
  WEAPON_BASE_TYPES,
  WEAPON_SUBTYPE_LOCALIZED,
  WEAPON_SUBTYPES,
  WEAPON_TYPE_LOCALIZED,
  WEAPON_TYPES,
  weaponSubtypeSelectOptions,
  weaponTypeSelectOptions,
} from './constants.mjs';
import type {
  WeaponDamage,
  WeaponSystemData,
  WeaponSystemSource,
} from './WeaponSystemData.mjs';
import { WeaponSystemModel } from './WeaponSystemModel.mjs';

export type {
  WeaponBaseType,
  WeaponDamage,
  WeaponSubtype,
  WeaponSystemData,
  WeaponSystemSource,
  WeaponType,
};

export {
  WEAPON_BASE_TYPES,
  WEAPON_SUBTYPE_LOCALIZED,
  WEAPON_SUBTYPES,
  WEAPON_TYPE_LOCALIZED,
  WEAPON_TYPES,
  weaponSubtypeSelectOptions,
  WeaponSystemModel,
  weaponTypeSelectOptions,
};
