import type { MeleeWeaponProperty } from '../MeleeWeaponAttack/constants.mjs';
import type { RangedWeaponProperty } from '../RangedAttack/constants.mjs';

// Weapon Properties
const WEAPON_PROPERTY_NON_LETHAL = 'nonLethal' as const;
const WEAPON_PROPERTY_NON_LETHAL_NO_PENALTY = 'nonLethalNoPenalty' as const;

const WEAPON_PROPERTIES = [
  WEAPON_PROPERTY_NON_LETHAL,
  WEAPON_PROPERTY_NON_LETHAL_NO_PENALTY,
] as const;
type WeaponProperty = (typeof WEAPON_PROPERTIES)[number];

const WEAPON_PROPERTY = {
  NON_LETHAL: WEAPON_PROPERTY_NON_LETHAL,
  NON_LETHAL_NO_PENALTY: WEAPON_PROPERTY_NON_LETHAL_NO_PENALTY,
};

const WEAPON_PROPERTY_LOCALIZED: Record<WeaponProperty, string> = {
  [WEAPON_PROPERTY_NON_LETHAL]: 'dnd35e.WEAPON.Property.nonLethal',
  [WEAPON_PROPERTY_NON_LETHAL_NO_PENALTY]: 'dnd35e.WEAPON.Property.nonLethalNoPenalty',
};

type AllWeaponProperties = WeaponProperty
  | MeleeWeaponProperty
  | RangedWeaponProperty;

export type {
  AllWeaponProperties,
  WeaponProperty,
};

export {
  WEAPON_PROPERTIES,
  WEAPON_PROPERTY,
  WEAPON_PROPERTY_LOCALIZED,
};
