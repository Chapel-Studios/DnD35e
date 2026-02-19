
const weaponItemType = 'weapon';
type WeaponItemType = typeof weaponItemType;

const EQUIPPABLE_ITEM_TYPES = new Set([
  weaponItemType,
] as const);
type EquippableItemType = SetElement<typeof EQUIPPABLE_ITEM_TYPES>;

const PHYSICAL_ITEM_TYPES = new Set([
  ...EQUIPPABLE_ITEM_TYPES,
] as const);
type PhysicalItemType = SetElement<typeof PHYSICAL_ITEM_TYPES>;

type ItemType = PhysicalItemType;


const ITEM_TYPES_LOCALIZED = {
  [weaponItemType]: 'TYPES.Item.weapon',
  // equipment: "D35E.ItemTypeEquipment",
  // loot: "D35E.ItemTypeLoot",
  // Consumable: "D35E.ItemTypeConsumable",
  // Class: "D35E.ItemTypeClass",
  // Buff: "D35E.ItemTypeBuff",
  // Spell: "D35E.ItemTypeSpell",
  // Feat: "D35E.ItemTypeFeat",
  // Attack: "D35E.ItemTypeAttack",
} as const satisfies Record<ItemType, string>;

type ItemTypeLocalizationValues = typeof ITEM_TYPES_LOCALIZED[keyof typeof ITEM_TYPES_LOCALIZED];

export {
  ITEM_TYPES_LOCALIZED,
  PHYSICAL_ITEM_TYPES,
  weaponItemType,
};

export type {
  EquippableItemType,
  ItemType,
  ItemTypeLocalizationValues,
  PhysicalItemType,
  WeaponItemType,
};
