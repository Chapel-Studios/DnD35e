import type { ArmorItemType } from '@items/itemTypes.mjs';
import { EquippableItem } from '@items/physical/equippableItem/index.mjs';
import type { PhysicalItemSourceProps } from '@items/physical/physicalItem/index.mjs';

import type { ArmorSystemData, ArmorSystemSource } from './index.mjs';

type ArmorSource = Omit<foundry.documents.ItemSource, 'system'>
  & Omit<PhysicalItemSourceProps, 'system'>
  & { system: ArmorSystemSource; };

class Armor extends EquippableItem {
  declare system: ArmorSystemData;
  declare type: ArmorItemType;

  override prepareBaseData (): void {
    super.prepareBaseData();
  }
}

type ArmorType = Armor;

export {
  Armor,
};

export type {
  ArmorSource,
  ArmorType,
};
