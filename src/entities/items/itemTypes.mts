import type { PhysicalItemType } from './components/Physical/index.mjs';

type ItemType = PhysicalItemType | 'material';

const ITEM_TYPES = {
  weapon: "TYPES.Item.weapon",
  material: "TYPES.Item.material",
  // equipment: "D35E.ItemTypeEquipment",
  // loot: "D35E.ItemTypeLoot",
  // Consumable: "D35E.ItemTypeConsumable",
  // Class: "D35E.ItemTypeClass",
  // Buff: "D35E.ItemTypeBuff",
  // Spell: "D35E.ItemTypeSpell",
  // Feat: "D35E.ItemTypeFeat",
  // Attack: "D35E.ItemTypeAttack",
} as const satisfies Record<ItemType, string>;

type ItemTypeLocalizationValues = typeof ITEM_TYPES[keyof typeof ITEM_TYPES];

export {
  ITEM_TYPES,
};

export type {
  ItemType,
  ItemTypeLocalizationValues
}
