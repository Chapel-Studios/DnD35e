import { materialItemType } from '@items/material/Material.mjs';

const { fields: { ArrayField, DocumentUUIDField } } = foundry.data;

const applyHasMaterialsSchema = (schema: Record<string, any>) => {
  schema.materials = new ArrayField(new DocumentUUIDField({
    type: 'Item',
    validate: (value, _options) => {
      const id = String(value);
      const item = game.items?.get(id) ?? null;
      if (!item) return false;
      return item.type === materialItemType;
    },
  }),
  {
    initial: [],
  });
};

export {
  applyHasMaterialsSchema,
};
