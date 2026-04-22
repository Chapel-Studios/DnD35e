import type { EquipSlot } from '@constants/equipmentSlots.mjs';
import type { Size } from '@constants/sizes.mjs';
import type { PhysicalItemSystemData } from '@items/components/Physical/index.mjs';

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
