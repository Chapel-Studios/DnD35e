import { SIZES } from '@constants/sizes.mjs';
import { IdentifiableSchemaMixin } from '@documents/identifiable/data/index.mjs';
import {
  optionalNumberField,
  optionalStringField,
  requiredBooleanField,
  requiredNumberField,
  useDnd35eField,
} from '@fields/fieldBuilders.mjs';
import { PriceField } from '@fields/PriceField.mjs';
import { SectionField } from '@fields/SectionField.mjs';
import { ItemSystemModel } from '@items/baseItem/data/index.mjs';

import type { PhysicalItemSystemData } from './PhysicalItemSystemData.mjs';

const { fields: { StringField } } = foundry.data;

/** Pre-composed: ItemSystemModel + identifiable schema fields. */
const IdentifiableItemSystemModel = IdentifiableSchemaMixin(ItemSystemModel);

/**
 * Abstract system model for all physical items.
 * Inherits identifiable fields from {@link IdentifiableSchemaMixin} and adds
 * weight, HP, hardness, price, and container fields.
 */
abstract class PhysicalItemSystemModel extends IdentifiableItemSystemModel {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.PHYSICAL_ITEM'];

  static override defineSchema (): Record<string, any> {
    const schema = super.defineSchema();

    // Physical
    schema.hp = new SectionField({
      current: useDnd35eField(requiredNumberField(0)),
      max: useDnd35eField(requiredNumberField(0)),
    });
    schema.hardness = useDnd35eField(requiredNumberField(0));
    schema.quantity = useDnd35eField(requiredNumberField(0));
    schema.weight = useDnd35eField(optionalNumberField(0));
    // schema.isWeightlessInContainer = requiredBooleanField(false);
    // schema.isWeightlessWhenCarried = requiredBooleanField(false);
    schema.isCarried = requiredBooleanField(true);
    schema.size = useDnd35eField(new StringField({ choices: SIZES, initial: 'tiny', required: true }));
    // Price - EmbeddedDataField wrapping PriceData with coin stacks
    schema.price = useDnd35eField(new PriceField({}));
    schema.isBroken = requiredBooleanField(false);

    // Container
    schema.containerId = optionalStringField();

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    this.effectiveWeight = this.weight ?? 0;
    if (!this.parent?.parent) {
      this.isCarried = false;
    }
    this.magicEquivalency = this.magicEquivalency ?? 0;
    this.damageReductionTypes = this.damageReductionTypes ?? [];
  }
}

interface PhysicalItemSystemModel extends PhysicalItemSystemData {}

export {
  PhysicalItemSystemModel,
};
