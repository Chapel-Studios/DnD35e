import {
  nullableOptionalStringField,
  optionalStringField,
  requiredBooleanField,
  requiredStringField,
} from '@helpers/fieldBuilders.mjs';

const {
  HTMLField,
  SchemaField,
} = foundry.data.fields;

const applyBaseDnd35eSystemSchema = (schema: Record<string, any>) => {
  schema.version = requiredStringField('1.0.0');
  schema.uniqueId = optionalStringField();
  schema.nameFormula = nullableOptionalStringField();
  schema.isNameFromFormula = requiredBooleanField(false);
  schema.description = new SchemaField({
    value: new HTMLField(),
  });
};

export { applyBaseDnd35eSystemSchema };
