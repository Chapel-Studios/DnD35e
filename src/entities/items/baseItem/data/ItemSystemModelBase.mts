import {
  applyBaseDnd35eSystemSchema,
} from '@ec/CoreMixin/index.mjs';
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
    const schema = {
      // System Base

      origin: new SchemaField({
        originId: requiredStringField(),
        originVersion: requiredStringField(),
        originPack: requiredStringField(),
      }),


      isPsionic: requiredBooleanField(),
      isEpic: requiredBooleanField(),
    };

    applyBaseDnd35eSystemSchema(schema);
    return schema;
  }
}

export {
  ItemSystemModelBase,
};
