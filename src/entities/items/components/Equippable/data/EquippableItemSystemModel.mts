import { EquipSlot } from '@constants/equipmentSlots.mjs';
import { SIZES } from '@constants/sizes.mjs';
import { requiredBooleanField } from '@helpers/fieldBuilders.mjs';
import { Dnd35eField } from '@helpers/fields/index.mjs';
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
    schema.isEquipped = requiredBooleanField('D35E.IsEquipped', 'D35E.IsEquippedHint', false);
    schema.equippedSlotIds = new ArrayField(
      new StringField<EquipSlot, EquipSlot, true, false, true>({ required: true }),
      { initial: [], required: true }
    );
    schema.isMelded = requiredBooleanField('D35E.IsMelded', 'D35E.IsMeldedHint', false);
    schema.designedForSize = new Dnd35eField(StringField, { choices: SIZES, initial: 'medium', required: true }, { label: 'Designed For Size', hint: 'The size category this item is designed for. This may affect the item\'s stats and which characters can equip it.' });
    schema.isWeightlessWhenEquipped = requiredBooleanField('D35E.IsWeightlessWhenEquipped', 'D35E.IsWeightlessWhenEquippedHint', false);

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    this.effectiveWeight = this.isWeightlessWhenEquipped && this.isCarried
      ? 0
      : this.weight.value ?? 0;
  }
}

interface EquippableItemSystemModel extends EquippableItemSystemData {}

export { EquippableItemSystemModel };
