import type {
  ArmorBaseType,
//  ArmorDamage,
  ArmorSubtype,
  ArmorSystemData,
  ArmorSystemSource,
  ArmorType,
} from './data/index.mjs';
import {
  ARMOR_BASE_TYPES,
  ARMOR_SUBTYPE_LOCALIZED,
  ARMOR_SUBTYPES,
  ARMOR_TYPE_LOCALIZED,
  ARMOR_TYPES,
  ArmorSubtypeSelectOptions,
  ArmorSystemModel,
  ArmorTypeSelectOptions,
} from './data/index.mjs';
import type {
  ArmorSheetConfig,
  ArmorSheetRenderContext,
  ArmorStore,
} from './sheet/index.mjs';
import {
  useArmorStore,
  ArmorDetails,
  armorDetailsTab,
  ArmorSheet,
  ArmorSheetVue,
  ArmorSummary,
} from './sheet/index.mjs';
import {
  Armor,
} from './Armor.mjs';

export {
  useArmorStore,
  Armor,
  ARMOR_BASE_TYPES,
  ARMOR_SUBTYPE_LOCALIZED,
  ARMOR_SUBTYPES,
  ARMOR_TYPE_LOCALIZED,
  ARMOR_TYPES,
  ArmorDetails,
  armorDetailsTab,
  ArmorSheet,
  ArmorSheetVue,
  ArmorSubtypeSelectOptions,
  ArmorSummary,
  ArmorSystemModel,
  ArmorTypeSelectOptions,
};

export type {
  ArmorBaseType,
  ArmorDamage,
  ArmorSheetConfig,
  ArmorSheetRenderContext,
  ArmorStore,
  ArmorSubtype,
  ArmorSystemData,
  ArmorSystemSource,
  ArmorType,
};
