import {
  requiredBooleanField,
  requiredStringField,
} from '@helpers/fieldBuilders.mjs';

const {
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

      origin: new SchemaField({
        originId: requiredStringField(),
        originVersion: requiredStringField(),
        originPack: requiredStringField(),
      }),


      isPsionic: requiredBooleanField(),
      isEpic: requiredBooleanField(),
    };
  }
}

export {
  ItemSystemModelBase,
};
