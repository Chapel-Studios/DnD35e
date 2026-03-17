import { EquipSlot } from '@constants/equipmentSlots.mjs';
import { Size, SIZES } from '@constants/sizes.mjs';
import { requiredBooleanField } from '@helpers/fieldBuilders.mjs';
import { PhysicalItemSystemModel } from '@items/components/Physical/data/PhysicalItemSystemModel.mjs';

import { EquippableItemSystemData } from './EquippableItemSystemData.mjs';

const { fields: { ArrayField, StringField } } = foundry.data;

/**
 * Abstract system model for all equippable items.
 * Inherits physical + identifiable fields and adds equipment slot, meld, and size fields.
 */
abstract class EquippableItemSystemModel extends PhysicalItemSystemModel {
  static override defineSchema (): Record<string, any> {
    const schema = super.defineSchema();

    // Equippable
    schema.isEquipped = requiredBooleanField(false);
    schema.equippedSlotIds = new ArrayField(
      new StringField<EquipSlot, EquipSlot, true, false, true>({ required: true }),
      { initial: [], required: true }
    );
    schema.isMelded = requiredBooleanField(false);
    schema.designedForSize = new StringField<Size, Size, true, false, true>({ choices: SIZES, initial: 'medium', required: true });
    schema.isWeightlessWhenEquipped = requiredBooleanField(false);

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    this.effectiveWeight = this.isWeightlessWhenEquipped && this.isCarried
      ? 0
      : this.weight ?? 0;
  }
}

interface EquippableItemSystemModel extends EquippableItemSystemData {}

export { EquippableItemSystemModel };
