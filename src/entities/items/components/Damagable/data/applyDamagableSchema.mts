import { requiredNumberField } from "@helpers/fieldBuilders.mjs";

const { fields: { SchemaField } } = foundry.data;

const applyDamagableSchema = (schema: Record<string, any>) => {
  schema.hp = new SchemaField({
    value: requiredNumberField(0),
    max: requiredNumberField(0),
  });
  schema.hardness = requiredNumberField(0);
};

export { applyDamagableSchema };
