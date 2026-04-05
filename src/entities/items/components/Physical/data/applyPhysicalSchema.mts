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
  // Components -
  //     ...defineCursableSchema(),
  //     ...defineChangesSchema(),
  //     ...defineAlignmentSchema(),

  // Physical
  schema.hp = new SchemaField({
    current: requiredNumberField('D35E.CurrentHp', 'D35E.CurrentHpHint', 0),
    max: requiredNumberField('D35E.MaxHp', 'D35E.MaxHpHint', 0),
  });
  schema.hardness = requiredNumberField('D35E.Hardness', 'D35E.HardnessHint', 0);
  schema.quantity = requiredNumberField('D35E.Quantity', 'D35E.QuantityHint', 0);
  schema.weight = optionalNumberField('D35E.Weight', 'D35E.WeightHint');
  schema.isWeightlessInContainer = requiredBooleanField('D35E.IsWeightlessInContainer', 'D35E.IsWeightlessInContainerHint', false);
  schema.isWeightlessWhenCarried = requiredBooleanField('D35E.IsWeightlessWhenCarried', 'D35E.IsWeightlessWhenCarriedHint', false);
  schema.isCarried = requiredBooleanField('D35E.IsCarried', 'D35E.IsCarriedHint', true);
  schema.size = new StringField<Size, Size, true, false, true>({ choices: SIZES, initial: 'tiny', required: true });

  // Price
  schema.price = requiredNumberField('D35E.Price', 'D35E.PriceHint', 0);
  schema.resalePrice = optionalNumberField('D35E.ResalePrice', 'D35E.ResalePriceHint');
  schema.brokenResalePrice = optionalNumberField('D35E.BrokenResalePrice', 'D35E.BrokenResalePriceHint');
  schema.isBroken = requiredBooleanField('D35E.IsBroken', 'D35E.IsBrokenHint', false);

  // Container
  schema.containerId = optionalStringField('D35E.ContainerId', 'D35E.ContainerIdHint');
};

export { applyPhysicalSchema };
