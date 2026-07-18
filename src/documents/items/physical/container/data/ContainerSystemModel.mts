import { CurrencyField } from '@fields/currency/CurrencyField.mjs';
import {
  derivedBooleanField,
  derivedNumberField,
  requiredBooleanField,
  useDnd35eField,
} from '@fields/fieldBuilders.mjs';
import { PhysicalItemSystemModel } from '@items/physical/physicalItem/data/PhysicalItemSystemModel.mjs';

import type { ContainerSystemData } from './ContainerSystemData.mjs';

const {
  fields: {
    NumberField,
  },
} = foundry.data;

/**
 * System model for container items (backpacks, bags of holding, etc.).
 * Branches off {@link PhysicalItemSystemModel} — containers are not equippable.
 * contentsWeight and contentsCount are populated by item-contribution AEs that
 * contained items push onto this bag during _onUpdate.
 */
class ContainerSystemModel extends PhysicalItemSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.CONTAINER'];

  static override defineSchema (): Record<string, any> {
    const schema = super.defineSchema();

    schema.maxContentWeight = useDnd35eField(new NumberField({ required: true, nullable: true, initial: null, min: 0 }));
    schema.contentsAreWeightless = useDnd35eField(requiredBooleanField(false));

    // Derived (persisted: false) — recomputed each cycle from contained items.
    schema.contentsWeight = derivedNumberField(0);
    schema.contentsCount = derivedNumberField(0);
    schema.isOverCapacity = derivedBooleanField(false);
    schema.contentsValue = useDnd35eField(new CurrencyField({ persisted: false }));

    return schema;
  }
}

interface ContainerSystemModel extends ContainerSystemData {}

export { ContainerSystemModel };
