import { Size, SIZES } from '@constants/sizes.mjs';
import {
  optionalNumberField,
  optionalStringField,
  requiredBooleanField,
  requiredNumberField,
} from '@helpers/fieldBuilders.mjs';

const { fields: { StringField, SchemaField } } = foundry.data;

/**
 * @deprecated Use {@link PhysicalItemSystemModel} instead.
 * Legacy functional schema applier — retained for backward compatibility.
 */
const applyPhysicalSchema = (schema: Record<string, any>) => {
  // Components - now using IdentifiableSchemaMixin on the model class
  // applyIdentifiableSchema(schema);
  //     ...defineCursableSchema(),
  //     ...defineChangesSchema(),
  //     ...defineAlignmentSchema(),

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
};

export { applyPhysicalSchema };
