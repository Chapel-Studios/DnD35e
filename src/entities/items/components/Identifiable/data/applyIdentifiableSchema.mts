import {
  nullableOptionalStringField,
  optionalHtmlField,
  optionalStringField,
  requiredBooleanField,
  requiredNullableNumberField
} from "@helpers/fieldBuilders.mjs";

const { fields: { SchemaField } } = foundry.data;

const applyIdentifiableSchema = (schema: Record<string, any>) => {
  schema.identified = requiredBooleanField(false);
  schema.isIdentifiable = requiredBooleanField(false);
  schema.unidentifiedInfo = new SchemaField({
    unidentifiedName: optionalStringField(),
    unidentifiedDescription: optionalHtmlField(),
    unidentifiedPrice: requiredNullableNumberField(),
    isIdentified: requiredBooleanField(false),
    unidentifiedNameFormula: nullableOptionalStringField(undefined),
    isUnidentifiedNameFromFormula: requiredBooleanField(false),
  }, { required: false, nullable: true });
}

export { applyIdentifiableSchema };
