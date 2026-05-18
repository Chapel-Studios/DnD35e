import type { SelectOption } from '@vc/fields/index.mjs';

const WEAPON_TYPES = new Set([
  'simple',
  'martial',
  'exotic',
  'misc',
] as const);
type WeaponType = SetElement<typeof WEAPON_TYPES>;
const WEAPON_TYPE_LOCALIZED: Record<WeaponType, string> = {
  'simple': 'dnd35e.WEAPON.Type.simple',
  'martial': 'dnd35e.WEAPON.Type.martial',
  'exotic': 'dnd35e.WEAPON.Type.exotic',
  'misc': 'dnd35e.WEAPON.Type.misc',
} as const;
const weaponTypeSelectOptions = Object.entries(WEAPON_TYPE_LOCALIZED)
  .map(([value, label]) => ({ value, label } as SelectOption<WeaponType>));


const WEAPON_SUBTYPES = new Set([
  'unarmed',
  'light',
  'oneHanded',
  'twoHanded',
  'ranged',
  // 'thrown',
] as const);
type WeaponSubtype = SetElement<typeof WEAPON_SUBTYPES>;
const WEAPON_SUBTYPE_LOCALIZED: Record<WeaponSubtype, string> = {
  'unarmed': 'dnd35e.WEAPON.Subtype.unarmed',
  'light': 'dnd35e.WEAPON.Subtype.light',
  'oneHanded': 'dnd35e.WEAPON.Subtype.oneHanded',
  'twoHanded': 'dnd35e.WEAPON.Subtype.twoHanded',
  'ranged': 'dnd35e.WEAPON.Subtype.ranged',
} as const;
const weaponSubtypeSelectOptions = Object.entries(WEAPON_SUBTYPE_LOCALIZED)
  .map(([value, label]) => ({ value, label } as SelectOption<WeaponSubtype>));

const WEAPON_BASE_TYPES = [
  '',
  'bastard sword',
  'battleaxe',
  'bolas',
  'club',
  'dagger',
  'dart',
  'dire flail',
  'dwarven urgrosh',
  'dwarven waraxe',
  'falchion',
  'flail',
  'gauntlet',
  'glaive',
  'gnome hooked hammer',
  'greataxe',
  'greatclub',
  'greatsword',
  'guisarme',
  'halberd',
  'hand crossbow',
  'handaxe',
  'heavy crossbow',
  'heavy flail',
  'heavy mace',
  'heavy pick',
  'heavy shield',
  'javelin',
  'kama',
  'kukri',
  'lance',
  'light crossbow',
  'light hammer',
  'light mace',
  'light pick',
  'light shield',
  'longbow',
  'longspear',
  'longsword',
  'morningstar',
  'net',
  'nunchaku',
  'orc double axe',
  'punching dagger',
  'quarterstaff',
  'ranseur',
  'rapier',
  'repeating heavy crossbow',
  'repeating light crossbow',
  'sai',
  'sap',
  'scimitar',
  'scythe',
  'short sword',
  'shortbow',
  'shortspear',
  'shuriken',
  'sickle',
  'siangham',
  'sling',
  'spiked armor',
  'spiked chain',
  'spiked gauntlet',
  'spear',
  'throwing axe',
  'trident',
  'two-bladed sword',
  'unarmed strike',
  'warhammer',
  'whip',
] as const;
type WeaponBaseType = (typeof WEAPON_BASE_TYPES)[number];

export type {
  WeaponBaseType,
  WeaponSubtype,
  WeaponType,
};

export {
  WEAPON_BASE_TYPES,
  WEAPON_SUBTYPE_LOCALIZED,
  WEAPON_SUBTYPES,
  WEAPON_TYPE_LOCALIZED,
  WEAPON_TYPES,
  weaponSubtypeSelectOptions,
  weaponTypeSelectOptions,
};
