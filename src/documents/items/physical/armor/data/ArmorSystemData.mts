import type { ItemSystemData } from '@items/baseItem/index.mjs';
import type { EquippableItemSystemData } from '@items/physical/equippableItem/index.mjs';

import type { ArmorBaseType, ArmorSubtype, ArmorType } from './index.mjs';

interface ArmorSystemSource {
  isMasterwork: boolean;
  armorType: ArmorType;
  armorSubtype: ArmorSubtype;
  armorBaseType: ArmorBaseType;
}

type ArmorSystemData = ArmorSystemSource
  & ItemSystemData
  & EquippableItemSystemData;

export type {
  ArmorSystemData,
  ArmorSystemSource,
};

