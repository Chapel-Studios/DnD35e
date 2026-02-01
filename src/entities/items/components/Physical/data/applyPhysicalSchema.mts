import { Size, SIZES } from "@constants/sizes.mjs";
import { optionalNumberField, optionalStringField, requiredBooleanField, requiredNumberField } from "@helpers/fieldBuilders.mjs";
import { applyDamagableSchema } from "@items/components/Damagable/index.mjs";
import { applyIdentifiableSchema } from "@items/components/Identifiable/index.mjs";

const { fields: { StringField } } = foundry.data;

const applyPhysicalSchema = (schema: Record<string, any>) => {
  // Components
  applyIdentifiableSchema(schema);
  applyDamagableSchema(schema);
  //     ...defineCursableSchema(),
  //     ...defineChangesSchema(),
  //     ...defineAlignmentSchema(),

  // Physical
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
  schema.isFullResalePrice = requiredBooleanField(true);

  // Container
  schema.containerId = optionalStringField();
};

export { applyPhysicalSchema };