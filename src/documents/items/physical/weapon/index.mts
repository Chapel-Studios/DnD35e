import type {
  WeaponSubtype,
  WeaponSystemData,
  WeaponSystemSource,
  WeaponType,
} from './data/index.mjs';
import {
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
import type {
  WeaponSource,
} from './Weapon.mjs';
import {
  Weapon,
} from './Weapon.mjs';

export {
  useWeaponStore,
  Weapon,
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
  WeaponSheetConfig,
  WeaponSheetRenderContext,
  WeaponSource,
  WeaponStore,
  WeaponSubtype,
  WeaponSystemData,
  WeaponSystemSource,
  WeaponType,
};
