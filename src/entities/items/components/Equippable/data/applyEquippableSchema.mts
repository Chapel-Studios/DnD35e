import { EquipSlot } from '@constants/equipmentSlots.mjs';
import { Size, SIZES } from '@constants/sizes.mjs';
import { requiredBooleanField } from '@helpers/fieldBuilders.mjs';
import { applyHasMaterialsSchema } from '@items/components/HasMaterial/index.mjs';
import { applyPhysicalSchema } from '@items/components/Physical/index.mjs';

const { fields: { ArrayField, StringField } } = foundry.data;

const applyEquippableSchema = (schema: Record<string, any>) => {
  applyPhysicalSchema(schema);
  applyHasMaterialsSchema(schema);

  // Equippable
  schema.isEquipped = requiredBooleanField(false);
  schema.equippedSlotIds = new ArrayField(
    new StringField<EquipSlot, EquipSlot, true, false, true>({ required: true }),
    { initial: [], required: true },
  );
  schema.isMelded = requiredBooleanField(false);
  schema.designedForSize = new StringField<Size, Size, true, false, true>({ choices: SIZES, initial: 'medium', required: true });
  schema.isWeightlessWhenEquipped = requiredBooleanField(false);
};

export { applyEquippableSchema };
