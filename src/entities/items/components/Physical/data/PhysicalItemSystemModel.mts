import { Size, SIZES } from '@constants/sizes.mjs';
import { IdentifiableSchemaMixin } from '@ec/Identifiable/index.mjs';
import {
  optionalNumberField,
  optionalStringField,
  requiredBooleanField,
  requiredNumberField,
} from '@helpers/fieldBuilders.mjs';
import { ItemSystemModelBase } from '@items/baseItem/index.mjs';

import { PhysicalItemSystemData } from './PhysicalSystemData.mjs';

const { fields: { StringField, SchemaField, ArrayField } } = foundry.data;

/** Pre-composed: ItemSystemModelBase + identifiable schema fields. */
const IdentifiableItemSystemModel = IdentifiableSchemaMixin(ItemSystemModelBase);

/**
 * Schema for a single coin stack in a price.
 */
function coinStackSchema() {
  return new SchemaField({
    coinId: new StringField({ required: true, blank: false }),
    count: requiredNumberField(0),
  });
}

/**
 * Abstract system model for all physical items.
 * Inherits identifiable fields from {@link IdentifiableSchemaMixin} and adds
 * weight, HP, hardness, price, and container fields.
 */
abstract class PhysicalItemSystemModel extends IdentifiableItemSystemModel {
  static override defineSchema (): Record<string, any> {
    const schema = super.defineSchema();

    // Physical
    schema.hp = new SchemaField({
      value: requiredNumberField(0),
      max: requiredNumberField(0),
    });
    schema.hardness = requiredNumberField(0);
    schema.quantity = requiredNumberField(0);
    schema.weight = optionalNumberField();
    // schema.isWeightlessInContainer = requiredBooleanField(false);
    // schema.isWeightlessWhenCarried = requiredBooleanField(false);
    schema.isCarried = requiredBooleanField(true);
    schema.size = new StringField<Size, Size, true, false, true>({ choices: SIZES, initial: 'tiny', required: true });

    // Price - array of coin stacks
    schema.price = new ArrayField(coinStackSchema(), { initial: [] });
    schema.resalePrice = new ArrayField(coinStackSchema(), { required: false, nullable: true, initial: null });
    schema.brokenResalePrice = new ArrayField(coinStackSchema(), { required: false, nullable: true, initial: null });
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
  }
}

interface PhysicalItemSystemModel extends PhysicalItemSystemData {}

export { IdentifiableItemSystemModel, PhysicalItemSystemModel };
