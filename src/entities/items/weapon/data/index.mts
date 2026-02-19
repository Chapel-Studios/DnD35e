import type {
  WeaponBaseType,
  WeaponSubtype,
  WeaponType,
} from './constants.mjs';
import {
  WEAPON_SUBTYPES,
  WEAPON_TYPES,
  WEAPOON_BASE_TYPES,
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
  WEAPON_SUBTYPES,
  WEAPON_TYPES,
  WeaponSystemModel,
  WEAPOON_BASE_TYPES,
};
