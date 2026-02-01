import { materialItemType } from "@items/material/Material.mjs";

const { fields: { ArrayField, DocumentUUIDField } } = foundry.data;

const applyHasMaterialsSchema = (schema: Record<string, any>) => {
  schema.materials = new ArrayField(new DocumentUUIDField({
    type: "Item",
    validate: (value, options) => {
      debugger;
      // how can I use this to validate item is a material?
    }
  }),
  {
    initial: [],
  });
}

export {
  applyHasMaterialsSchema,
};
