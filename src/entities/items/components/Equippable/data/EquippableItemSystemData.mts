import { EquipSlot } from '@constants/equipmentSlots.mjs';
import { Size } from '@constants/sizes.mjs';
import type { Dnd35eFieldData } from '@helpers/fields/index.mjs';
import { PhysicalItemSystemData } from '@items/components/Physical/index.mjs';

interface EquippableItemSystemSource {
  isEquipped: boolean;
  equippedSlotIds: EquipSlot[];
  isMelded: boolean;
  designedForSize: Dnd35eFieldData<Size>;
  isWeightlessWhenEquipped: boolean;
}

interface EquippableItemSystemData extends EquippableItemSystemSource, PhysicalItemSystemData {}

export type {
  EquippableItemSystemData,
  EquippableItemSystemSource,
};
