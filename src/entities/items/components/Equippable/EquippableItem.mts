import { Size, SIZES } from '@constants/sizes.mjs';
import { requiredBooleanField, requiredStringField } from '@helpers/fieldBuilders.mjs';
import type { fields as fieldsType } from '@common/data/_module.mjs';

const { fields } = foundry.data;

type EquippableItem = {
    isEquipped: boolean;
    slot: string;
    isMelded: boolean;
    designedForSize: Size;
};

type EquippableItemSchema = {
    isEquipped: fieldsType.BooleanField<boolean, boolean, true, false, true>;
    slot: fieldsType.StringField<string, string, true, false, true>;
    isMelded: fieldsType.BooleanField<boolean, boolean, true, false, true>;
    designedForSize: fieldsType.StringField<Size, Size, true, false, true>;
};

const defineEquippableItemSchema = (): EquippableItemSchema => ({
  isEquipped: requiredBooleanField(false),
  slot: requiredStringField(''),
  isMelded: requiredBooleanField(false),
  designedForSize: new fields.StringField<Size, Size, true, false, true>({ choices: SIZES, initial: 'medium', required: true }),
});

export { defineEquippableItemSchema, type EquippableItem, type EquippableItemSchema };
