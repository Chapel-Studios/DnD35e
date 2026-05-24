import type { EquipSlot } from '@constants/equipmentSlots.mjs';
import { SIZES } from '@constants/sizes.mjs';
import { materialEffectType } from '@effects/material/materialEffectType.mjs';
import { derivedBooleanField, requiredBooleanField, useDnd35eField } from '@fields/fieldBuilders.mjs';
import { PhysicalItemSystemModel } from '@items/physical/physicalItem/data/PhysicalItemSystemModel.mjs';

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
    schema.designedForSize = useDnd35eField(new StringField({ choices: SIZES, initial: 'medium', required: true }));
    schema.isWeightlessWhenEquipped = requiredBooleanField(false);

    // Derived fields (persisted: false) — initialized each cycle, never saved to DB.
    schema.isMasterwork = derivedBooleanField(false);

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    this.effectiveWeight = this.isWeightlessWhenEquipped && this.isEquipped
      ? 0
      : this.weight ?? 0;
    // isMasterwork: derived from active masterwork material AEs — not stored field.
    const effects = (this.parent as unknown as { effects?: Iterable<unknown> } | null)?.effects;
    const effectList = effects ? [...effects] : [];
    this.isMasterwork = effectList.some((e) => {
      const ae = e as unknown as ActiveEffect;
      return (
        ae.type === materialEffectType
        && (ae.system as { materialSubtype?: string } | undefined)?.materialSubtype === 'masterwork'
        && !ae.disabled
      );
    });
  }
}

interface EquippableItemSystemModel extends EquippableItemSystemData {}

export { EquippableItemSystemModel };
