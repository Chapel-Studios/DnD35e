import type {
  WeaponBaseType,
  WeaponDamage,
  WeaponSubtype,
  WeaponSystemData,
  WeaponSystemSource,
  WeaponType,
} from './data/index.mjs';
import {
  WEAPON_BASE_TYPES,
  WEAPON_SUBTYPE_LOCALIZED,
  WEAPON_SUBTYPES,
  WEAPON_TYPE_LOCALIZED,
  WEAPON_TYPES,
  weaponSubtypeSelectOptions,
  WeaponSystemModel,
  weaponTypeSelectOptions,
} from './data/index.mjs';
import type {
  WeaponSheetConfig,
  WeaponSheetRenderContext,
  WeaponStore,
} from './sheet/index.mjs';
import {
  useWeaponStore,
  WeaponDetails,
  weaponDetailsTab,
  WeaponSheet,
  WeaponSheetVue,
  WeaponSummary,
} from './sheet/index.mjs';
import {
  Weapon,
} from './Weapon.mjs';

export {
  useWeaponStore,
  Weapon,
  WEAPON_BASE_TYPES,
  WEAPON_SUBTYPE_LOCALIZED,
  WEAPON_SUBTYPES,
  WEAPON_TYPE_LOCALIZED,
  WEAPON_TYPES,
  WeaponDetails,
  weaponDetailsTab,
  WeaponSheet,
  WeaponSheetVue,
  weaponSubtypeSelectOptions,
  WeaponSummary,
  WeaponSystemModel,
  weaponTypeSelectOptions,
};

export type {
  WeaponBaseType,
  WeaponDamage,
  WeaponSheetConfig,
  WeaponSheetRenderContext,
  WeaponStore,
  WeaponSubtype,
  WeaponSystemData,
  WeaponSystemSource,
  WeaponType,
};
