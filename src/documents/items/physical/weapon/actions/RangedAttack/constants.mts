
// Weapon Properties

import type { SelectOption } from '@vc/fields/formGroups/types.mjs';

import { WEAPON_PROPERTIES, WEAPON_PROPERTY, WEAPON_PROPERTY_LOCALIZED } from '../WeaponAttack/constants.mjs';

const WEAPON_PROPERTY_THROWN = 'thrown' as const;
const WEAPON_PROPERTY_RANGED_USES_STR = 'rangedUsesStr' as const;

const RANGED_WEAPON_PROPERTIES = [
  ...WEAPON_PROPERTIES,
  WEAPON_PROPERTY_THROWN,
  WEAPON_PROPERTY_RANGED_USES_STR,
] as const;
type RangedWeaponProperty = (typeof RANGED_WEAPON_PROPERTIES)[number];

const RANGED_WEAPON_PROPERTY = {
  ...WEAPON_PROPERTY,
  WEAPON_PROPERTY_THROWN,
  WEAPON_PROPERTY_RANGED_USES_STR,
};

const RANGED_WEAPON_PROPERTY_LOCALIZED: Record<RangedWeaponProperty, string> = {
  ...WEAPON_PROPERTY_LOCALIZED,
  [WEAPON_PROPERTY_THROWN]: 'dnd35e.WEAPON.Property.thrown',
  [WEAPON_PROPERTY_RANGED_USES_STR]: 'dnd35e.WEAPON.Property.rangedUsesStr',
};

const rangedWeaponPropertySelectOptions: SelectOption<RangedWeaponProperty>[] = RANGED_WEAPON_PROPERTIES.map((value) => ({
  value,
  label: RANGED_WEAPON_PROPERTY_LOCALIZED[value],
}));

export type {
  RangedWeaponProperty,
};

export {
  RANGED_WEAPON_PROPERTIES,
  RANGED_WEAPON_PROPERTY,
  RANGED_WEAPON_PROPERTY_LOCALIZED,
  rangedWeaponPropertySelectOptions,
};
