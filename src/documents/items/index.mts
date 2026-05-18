export type {
  EquippableItemType,
  ItemType,
  ItemTypeLocalizationValues,
  PhysicalItemType,
  WeaponItemType,
} from './itemTypes.mjs';
export {
  ITEM_TYPES_LOCALIZED,
  PHYSICAL_ITEM_TYPES,
  weaponItemType,
} from './itemTypes.mjs';
export { registerItems } from './registration.mjs';
export * as baseItem from '@items/baseItem/index.mjs';
export * as physicalItem from '@items/physical/physicalItem/index.mjs';
export * as weapon from '@items/physical/weapon/index.mjs';
