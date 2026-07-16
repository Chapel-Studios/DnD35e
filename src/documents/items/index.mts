export type {
  ContainerItemType,
  EquippableItemType,
  ItemType,
  ItemTypeLocalizationValues,
  PhysicalItemType,
  WeaponItemType,
} from './itemTypes.mjs';
export {
  containerItemType,
  ITEM_TYPES_LOCALIZED,
  PHYSICAL_ITEM_TYPES,
  weaponItemType,
} from './itemTypes.mjs';
export { registerItems } from './registration.mjs';
export * as baseItem from '@items/baseItem/index.mjs';
export * as container from '@items/physical/container/index.mjs';
export * as physicalItem from '@items/physical/physicalItem/index.mjs';
export * as weapon from '@items/physical/weapon/index.mjs';
