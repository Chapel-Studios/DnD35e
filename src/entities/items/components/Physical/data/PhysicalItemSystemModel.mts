import { SIZES } from '@constants/sizes.mjs';
import { IdentifiableSchemaMixin } from '@ec/Identifiable/index.mjs';
import {
  optionalStringField,
  requiredBooleanField,
} from '@helpers/fieldBuilders.mjs';
import { Dnd35eField, Dnd35eSectionField } from '@helpers/fields/index.mjs';
import { ItemSystemModelBase } from '@items/baseItem/index.mjs';
import { PriceField } from '@settings/currency/index.mjs';

import type { PhysicalItemSystemData } from './PhysicalSystemData.mjs';

const { fields: { NumberField, StringField } } = foundry.data;

/** Pre-composed: ItemSystemModelBase + identifiable schema fields. */
const IdentifiableItemSystemModel = IdentifiableSchemaMixin(ItemSystemModelBase);

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
    schema.hp = new Dnd35eSectionField({
      current: new Dnd35eField(NumberField, { required: true, nullable: false, initial: 0 }),
      max: new Dnd35eField(NumberField, { required: true, nullable: false, initial: 0 }),
    });
    schema.hardness = new Dnd35eField(NumberField, { required: true, nullable: false, initial: 0 });
    schema.quantity = new Dnd35eField(NumberField, { required: true, nullable: false, initial: 0 });
    schema.weight = new Dnd35eField(NumberField, { required: false, nullable: true, initial: 0 });
    // schema.isWeightlessInContainer = requiredBooleanField(false);
    // schema.isWeightlessWhenCarried = requiredBooleanField(false);
    schema.isCarried = requiredBooleanField(true);
    schema.size = new Dnd35eField(StringField, { choices: SIZES, initial: 'tiny', required: true });
    // Price - EmbeddedDataField wrapping PriceData with coin stacks
    schema.price = new Dnd35eField(PriceField, {});
    schema.resalePrice = new PriceField({ nullable: true, initial: null });
    schema.brokenResalePrice = new PriceField({ nullable: true, initial: null });
    schema.isBroken = requiredBooleanField(false);

    // Container
    schema.containerId = optionalStringField();

    return schema;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();
    this.effectiveWeight = this.weight.value ?? 0;
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
