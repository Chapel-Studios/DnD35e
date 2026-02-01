import type { fields as fieldsType } from '@common/data/_module.mjs';
import type { ModelPropsFromSchema, SourceFromSchema } from '@common/data/fields.mjs';
import { requiredBooleanField } from '@helpers/fieldBuilders.mjs';
const { fields } = foundry.data;

type CursableItem = {
    cursedInfo?: {
        isCursed: boolean;
        isCurseActive: boolean;
    };
};

type CursableItemSchemaBase = {
    isCursed: fieldsType.BooleanField;
    isCurseActive: fieldsType.BooleanField;
    // cursedInfo?: fields.SchemaField<{
    //     unidentifiedName: fields.StringField<string, string, false, false, true>;
    //     unidentifiedDescription: fields.StringField<string, string, false, false, true>;
    //     unidentifiedPrice: fields.NumberField<number, number, true, true, false>;
    // }>;
};

type CursableItemSchema = {
    cursedInfo: fieldsType.SchemaField<CursableItemSchemaBase, SourceFromSchema<CursableItemSchemaBase>, ModelPropsFromSchema<CursableItemSchemaBase>, false, true, false>;
}

const defineCursableSchema = (): CursableItemSchema => ({
  cursedInfo: new fields.SchemaField({
    isCursed: requiredBooleanField(),
    isCurseActive: requiredBooleanField(),
  }),
});

export { defineCursableSchema, type CursableItem, type CursableItemSchema };
