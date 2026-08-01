import type { Container } from './physical/container/index.mjs';
import type { Weapon } from './physical/weapon/index.mjs';

const weaponItemType = 'weapon';
type WeaponItemType = typeof weaponItemType;

const containerItemType = 'container';
type ContainerItemType = typeof containerItemType;

const EQUIPPABLE_ITEM_TYPES = new Set([
  weaponItemType,
] as const);
type EquippableItemType = SetElement<typeof EQUIPPABLE_ITEM_TYPES>;
type EQUIPPABLE_ITEMS = Weapon;

const PHYSICAL_ITEM_TYPES = new Set([
  ...EQUIPPABLE_ITEM_TYPES,
  containerItemType,
] as const);
type PhysicalItemType = SetElement<typeof PHYSICAL_ITEM_TYPES>;
type PHYSICAL_ITEMS = EQUIPPABLE_ITEMS | Container;

type ItemType = PhysicalItemType;

type ITEMS_DND35E = PHYSICAL_ITEMS;


const ITEM_TYPES_LOCALIZED = {
  [weaponItemType]: 'TYPES.Item.weapon',
  [containerItemType]: 'TYPES.Item.container',
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
  containerItemType,
  EQUIPPABLE_ITEM_TYPES,
  ITEM_TYPES_LOCALIZED,
  PHYSICAL_ITEM_TYPES,
  weaponItemType,
};

export type {
  ContainerItemType,
  EQUIPPABLE_ITEMS,
  EquippableItemType,
  ITEMS_DND35E,
  ItemType,
  ItemTypeLocalizationValues,
  PHYSICAL_ITEMS,
  PhysicalItemType,
  WeaponItemType,
};
