import { Size, SIZES } from '@constants/sizes.mjs';
import { IdentifiableSchemaMixin } from '@ec/Identifiable/index.mjs';
import {
  optionalNumberField,
  optionalStringField,
  requiredBooleanField,
  requiredNumberField,
} from '@helpers/fieldBuilders.mjs';
import { ItemSystemModelBase } from '@items/baseItem/index.mjs';

const { fields: { StringField, SchemaField } } = foundry.data;

/** Pre-composed: ItemSystemModelBase + identifiable schema fields. */
const IdentifiableItemSystemModel = IdentifiableSchemaMixin(ItemSystemModelBase);

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
    schema.isWeightlessInContainer = requiredBooleanField(false);
    schema.isWeightlessWhenCarried = requiredBooleanField(false);
    schema.isCarried = requiredBooleanField(true);
    schema.size = new StringField<Size, Size, true, false, true>({ choices: SIZES, initial: 'tiny', required: true });

    // Price
    schema.price = requiredNumberField(0);
    schema.resalePrice = optionalNumberField();
    schema.brokenResalePrice = optionalNumberField();
    schema.isBroken = requiredBooleanField(false);

    // Container
    schema.containerId = optionalStringField();

    return schema;
  }
}

export { IdentifiableItemSystemModel, PhysicalItemSystemModel };
