import type {
  WeaponSubtype,
  WeaponType,
} from './constants.mjs';
import {
  WEAPON_SUBTYPE_LOCALIZED,
  WEAPON_SUBTYPES,
  WEAPON_TYPE_LOCALIZED,
  WEAPON_TYPES,
  weaponSubtypeSelectOptions,
  weaponTypeSelectOptions,
} from './constants.mjs';
import type {
  WeaponSystemData,
  WeaponSystemSource,
} from './WeaponSystemData.mjs';
import { WeaponSystemModel } from './WeaponSystemModel.mjs';

export type {
  WeaponSubtype,
  WeaponSystemData,
  WeaponSystemSource,
  WeaponType,
};

export {
  WEAPON_SUBTYPE_LOCALIZED,
  WEAPON_SUBTYPES,
  WEAPON_TYPE_LOCALIZED,
  WEAPON_TYPES,
  weaponSubtypeSelectOptions,
  WeaponSystemModel,
  weaponTypeSelectOptions,
};
