import type { EquipSlot } from '@constants/equipmentSlots.mjs';
import type { Size } from '@constants/sizes.mjs';
import type { PhysicalItemSystemData } from '@items/physical/physicalItem/index.mjs';

interface EquippableItemSystemSource {
  isEquipped: boolean;
  equippedSlotIds: EquipSlot[];
  isMelded: boolean;
  designedForSize: Size;
  isWeightlessWhenEquipped: boolean;
}

interface EquippableItemSystemData extends EquippableItemSystemSource, PhysicalItemSystemData {
  /** Derived: true when any active masterwork-material AE is present. */
  isMasterwork: boolean;
}

export type {
  EquippableItemSystemData,
  EquippableItemSystemSource,
};
