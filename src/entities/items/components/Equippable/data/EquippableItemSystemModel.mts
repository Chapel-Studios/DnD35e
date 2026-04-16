import type { EquipSlot } from '@constants/equipmentSlots.mjs';
import { SIZES } from '@constants/sizes.mjs';
import { requiredBooleanField } from '@helpers/fieldBuilders.mjs';
import { Dnd35eField } from '@helpers/fields/index.mjs';
import { PhysicalItemSystemModel } from '@items/components/Physical/data/PhysicalItemSystemModel.mjs';

import type { EquippableItemSystemData } from './EquippableItemSystemData.mjs';

const { fields: { ArrayField, StringField } } = foundry.data;

/**
 * Abstract system model for all equippable items.
 * Inherits physical + identifiable fields and adds equipment slot, meld, and size fields.
 */
abstract class EquippableItemSystemModel extends PhysicalItemSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.EQUIPPABLE'];

  static override defineSchema (): Record<string, any> {
    const schema = super.defineSchema();

    // Equippable
    schema.isEquipped = requiredBooleanField(false);
    schema.equippedSlotIds = new ArrayField(
      new StringField<EquipSlot, EquipSlot, true, false, true>({ required: true }),
      { initial: [], required: true }
    );
    schema.isMelded = requiredBooleanField(false);
    schema.designedForSize = new Dnd35eField(StringField, { choices: SIZES, initial: 'medium', required: true });
    schema.isWeightlessWhenEquipped = requiredBooleanField(false);

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    this.effectiveWeight = this.isWeightlessWhenEquipped && this.isEquipped
      ? 0
      : this.weight.value ?? 0;
  }
}

interface EquippableItemSystemModel extends EquippableItemSystemData {}

export { EquippableItemSystemModel };
