const ARMOR_TYPES = new Set([
  'light',
  'medium',
  'heavy',
  'misc',
] as const);
type ArmorType = SetElement<typeof ARMOR_TYPES>;
const ARMOR_TYPE_LOCALIZED: Record<ArmorType, string> = {
  'light': 'D35E.ArmorTypeLight',
  'medium': 'D35E.ArmorTypeMedium',
  'heavy': 'D35E.ArmorTypeHeavy',
  'misc': 'D35E.ArmorTypeMisc',
} as const;
const ArmorTypeSelectOptions = Object.entries(ARMOR_TYPE_LOCALIZED)
  .map(([value, label]) => ({ value, label }));


const ARMOR_SUBTYPES = new Set([
  'cloth',
  'hide',
  'leather',
  'steel',
  'exotic',
  // 'thrown',
] as const);
type ArmorSubtype = SetElement<typeof ARMOR_SUBTYPES>;
const ARMOR_SUBTYPE_LOCALIZED: Record<ArmorSubtype, string> = {
  'cloth': 'D35E.ArmorPropCloth',
  'hide': 'D35E.ArmorPropHide',
  'leather': 'D35E.ArmorPropLeather',
  'steel': 'D35E.ArmorPropSteel',
  'exotic': 'D35E.ArmorSubtypeExotic',
} as const;
const ArmorSubtypeSelectOptions = Object.entries(ARMOR_SUBTYPE_LOCALIZED)
  .map(([value, label]) => ({ value, label }));

const ARMOR_BASE_TYPES = [
  '',
  'padded',
  'leather',
  'studded leather',
  'chain shirt',
  'hide',
  'scale mail',
  'chainmail',
  'breastplate',
  'splint mail',
  'banded mail',
  'half-plate',
  'full plate',
  'buckler',
  'shield light wooden',
  'shield light steel',
  'shield heavy wooden',
  'shield heavy steel',
  'shield tower',
  'armor spikes',
  'shield spikes',
] as const;
type ArmorBaseType = (typeof ARMOR_BASE_TYPES)[number];

export type {
  ArmorBaseType,
  ArmorSubtype,
  ArmorType,
};

export {
  ARMOR_BASE_TYPES,
  ARMOR_SUBTYPE_LOCALIZED,
  ARMOR_SUBTYPES,
  ARMOR_TYPE_LOCALIZED,
  ARMOR_TYPES,
  ArmorSubtypeSelectOptions,
  ArmorTypeSelectOptions,
};
