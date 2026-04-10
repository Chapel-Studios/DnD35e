import { EquippableItem } from '@items/components/Equippable/index.mjs';
import type { PhysicalItemSourceProps } from '@items/components/Physical/index.mjs';
import { ArmorItemType } from '@items/itemTypes.mjs';

import { ArmorSystemData, ArmorSystemSource } from './index.mjs';

type ArmorSource = Omit<foundry.documents.ItemSource, 'system'>
  & Omit<PhysicalItemSourceProps, 'system'>
  & { system: ArmorSystemSource; };

class Armor extends EquippableItem {
  declare system: ArmorSystemData;
  declare type: ArmorItemType;

  override prepareBaseData (): void {
    super.prepareBaseData();
  }
  // This needs to go to equippable
  // get equippedStatusLabel() {
  //   if (!this.parent) {
  //     return '';
  //   }

  //   return this.system.isEquipped
  //     ? 'D35E.Equipped'
  //     : 'D35E.NotEquipped';
  // }
}

type ArmorType = Armor;

export {
  Armor,
};

export type {
  ArmorSource,
  ArmorType,
};
