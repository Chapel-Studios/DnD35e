import type { SelectOption } from '@vc/fields/index.mjs';

import { WEAPON_PROPERTIES, WEAPON_PROPERTY, WEAPON_PROPERTY_LOCALIZED } from '../WeaponAttack/constants.mjs';

// Weapon Properties

/**
 * Weapon property flags (poc.10 §10.4). Only the five properties poc.10's own mechanics
 * touch are wired here — the SRD's remaining property checkboxes (`blocking`, `brace`,
 * `double`, `disarm`, `fragile`, `grapple`, `improvised`, `monk`, `performance`, `sunder`,
 * `trip`) are deferred to alpha.3 (combat maneuvers), which will widen `WEAPON_PROPERTIES`.
 */
const WEAPON_PROPERTY_FINESSE = 'finesse' as const;
const WEAPON_PROPERTY_REACH = 'reach' as const;
/**
 * Spiked chain (SRD) and homebrew weapons emulating it: still doubles `SIZE_REACH` like any
 * other reach weapon, but also threatens adjacent squares instead of leaving the usual dead
 * zone. Only meaningful in combination with `WEAPON_PROPERTY_REACH` — a no-op otherwise.
 */
const WEAPON_PROPERTY_THREATENS_ADJACENT = 'threatensAdjacent' as const;

const MELEE_WEAPON_PROPERTIES = [
  ...WEAPON_PROPERTIES,
  WEAPON_PROPERTY_FINESSE,
  WEAPON_PROPERTY_REACH,
  WEAPON_PROPERTY_THREATENS_ADJACENT,
] as const;
type MeleeWeaponProperty = (typeof MELEE_WEAPON_PROPERTIES)[number];

const MELEE_WEAPON_PROPERTY = {
  ...WEAPON_PROPERTY,
  FINESSE: WEAPON_PROPERTY_FINESSE,
  REACH: WEAPON_PROPERTY_REACH,
  THREATENS_ADJACENT: WEAPON_PROPERTY_THREATENS_ADJACENT,
};

const MELEE_WEAPON_PROPERTY_LOCALIZED: Record<MeleeWeaponProperty, string> = {
  ...WEAPON_PROPERTY_LOCALIZED,
  [WEAPON_PROPERTY_FINESSE]: 'dnd35e.WEAPON.Property.finesse',
  [WEAPON_PROPERTY_REACH]: 'dnd35e.WEAPON.Property.reach',
  [WEAPON_PROPERTY_THREATENS_ADJACENT]: 'dnd35e.WEAPON.Property.threatensAdjacent',
};

const meleeWeaponPropertySelectOptions: SelectOption<MeleeWeaponProperty>[] = MELEE_WEAPON_PROPERTIES.map((value) => ({
  value,
  label: MELEE_WEAPON_PROPERTY_LOCALIZED[value],
}));

export type {
  MeleeWeaponProperty,
};

export {
  MELEE_WEAPON_PROPERTIES,
  MELEE_WEAPON_PROPERTY,
  MELEE_WEAPON_PROPERTY_LOCALIZED,
  meleeWeaponPropertySelectOptions,
};
