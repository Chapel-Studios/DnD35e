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

abstract class ItemSystemModelBase extends foundry.abstract.TypeDataModel<
  foundry.documents.Item,
  foundry.abstract.DataSchema
> {
  declare parent: foundry.documents.Item;

  static override defineSchema (): Record<string, any> {
    return {
      // System Base
      version: requiredStringField('1.0.0'),
      uniqueId: optionalStringField(),

      origin: new SchemaField({
        originId: requiredStringField(),
        originVersion: requiredStringField(),
        originPack: requiredStringField(),
      }),

      nameFormula: nullableOptionalStringField(),
      isNameFromFormula: requiredBooleanField(false),
      description: new SchemaField({
        value: new HTMLField(),
      }),

      isPsionic: requiredBooleanField(),
      isEpic: requiredBooleanField(),
    };
  }
}

export {
  ItemSystemModelBase,
};
