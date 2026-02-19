import { EquipSlot } from '@constants/equipmentSlots.mjs';
import { Size } from '@constants/sizes.mjs';
import { PhysicalItemSystemData } from '@items/components/Physical/index.mjs';

interface EquippableItemSystemSource {
  isEquipped: boolean;
  equippedSlotIds: EquipSlot[];
  isMelded: boolean;
  designedForSize: Size;
  isWeightlessWhenEquipped: boolean;
}

interface EquippableItemSystemData extends EquippableItemSystemSource, PhysicalItemSystemData {}

export type {
  EquippableItemSystemData,
  EquippableItemSystemSource,
};
