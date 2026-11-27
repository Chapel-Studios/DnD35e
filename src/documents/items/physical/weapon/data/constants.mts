import type { SelectOption } from '@vc/fields/index.mjs';

const SIMPLE_WEAPON = 'simple';
const MARTIAL_WEAPON = 'martial';
const EXOTIC_WEAPON = 'exotic';
const MISC_WEAPON = 'misc';
const WEAPON_TYPES = new Set([
  SIMPLE_WEAPON,
  MARTIAL_WEAPON,
  EXOTIC_WEAPON,
  MISC_WEAPON,
] as const);
const WEAPON_TYPE = {
  SIMPLE: SIMPLE_WEAPON,
  MARTIAL: MARTIAL_WEAPON,
  EXOTIC: EXOTIC_WEAPON,
  MISC: MISC_WEAPON,
};
type WeaponType = SetElement<typeof WEAPON_TYPES>;
const WEAPON_TYPE_LOCALIZED: Record<WeaponType, string> = {
  'simple': 'dnd35e.WEAPON.Type.simple',
  'martial': 'dnd35e.WEAPON.Type.martial',
  'exotic': 'dnd35e.WEAPON.Type.exotic',
  'misc': 'dnd35e.WEAPON.Type.misc',
} as const;
const weaponTypeSelectOptions = Object.entries(WEAPON_TYPE_LOCALIZED)
  .map(([value, label]) => ({ value, label } as SelectOption<WeaponType>));


const UNARMED_WEAPON = 'unarmed';
const LIGHT_WEAPON = 'light';
const ONE_HANDED_WEAPON = 'oneHanded';
const TWO_HANDED_WEAPON = 'twoHanded';
const RANGED_WEAPON = 'ranged';
/** Ranged weapons that require both hands to use (longbow, heavy crossbow) — a deliberate
 * non-RAW split from `RANGED_WEAPON` purely so `weaponActionSync.mts` can tell one-handed
 * ranged weapons (hand crossbow, sling) apart from two-handed ones (poc.10 §10.3). */
const TWO_HANDED_RANGED_WEAPON = 'twoHandedRanged';
const WEAPON_SUBTYPES = new Set([
  UNARMED_WEAPON,
  LIGHT_WEAPON,
  ONE_HANDED_WEAPON,
  TWO_HANDED_WEAPON,
  RANGED_WEAPON,
  TWO_HANDED_RANGED_WEAPON,
] as const);
const WEAPON_SUBTYPE = {
  UNARMED_WEAPON,
  LIGHT_WEAPON,
  ONE_HANDED_WEAPON,
  TWO_HANDED_WEAPON,
  RANGED_WEAPON,
  TWO_HANDED_RANGED_WEAPON,
};
type WeaponSubtype = SetElement<typeof WEAPON_SUBTYPES>;
const WEAPON_SUBTYPE_LOCALIZED: Record<WeaponSubtype, string> = {
  'unarmed': 'dnd35e.WEAPON.Subtype.unarmed',
  'light': 'dnd35e.WEAPON.Subtype.light',
  'oneHanded': 'dnd35e.WEAPON.Subtype.oneHanded',
  'twoHanded': 'dnd35e.WEAPON.Subtype.twoHanded',
  'ranged': 'dnd35e.WEAPON.Subtype.ranged',
  'twoHandedRanged': 'dnd35e.WEAPON.Subtype.twoHandedRanged',
} as const;
const weaponSubtypeSelectOptions = Object.entries(WEAPON_SUBTYPE_LOCALIZED)
  .map(([value, label]) => ({ value, label } as SelectOption<WeaponSubtype>));

export type {
  WeaponSubtype,
  WeaponType,
};

export {
  WEAPON_SUBTYPE,
  WEAPON_SUBTYPE_LOCALIZED,
  WEAPON_SUBTYPES,
  WEAPON_TYPE,
  WEAPON_TYPE_LOCALIZED,
  WEAPON_TYPES,
  weaponSubtypeSelectOptions,
  weaponTypeSelectOptions,
};
