export type {
  EquippableItemType,
  ItemType,
  ItemTypeLocalizationValues,
  PhysicalItemType,
  WeaponItemType,
  ArmorItemType,
} from './itemTypes.mjs';
export {
  ITEM_TYPES_LOCALIZED,
  PHYSICAL_ITEM_TYPES,
  weaponItemType,
  armorItemType,
} from './itemTypes.mjs';
export { registerItems } from './registration.mjs';
export * as baseItem from '@items/baseItem/index.mjs';
export * as physicalItem from '@items/components/Physical/index.mjs';
export * as weapon from '@items/weapon/index.mjs';
export * as armor from '@items/armor/index.mjs';
