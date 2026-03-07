import { Dnd35eDocumentSystemModel } from '@ec/CoreMixin/data/Dnd35eDocumentSystemModel.mjs';
import {
  requiredBooleanField,
  requiredStringField,
} from '@helpers/fieldBuilders.mjs';

const {
  SchemaField,
} = foundry.data.fields;

abstract class ItemSystemModelBase extends Dnd35eDocumentSystemModel<foundry.documents.Item> {
  static override defineSchema (): Record<string, any> {
    const superSchema = super.defineSchema();
    const schema = {
      origin: new SchemaField({
        originId: requiredStringField(),
        originVersion: requiredStringField(),
        originPack: requiredStringField(),
      }),

      isPsionic: requiredBooleanField(),
      isEpic: requiredBooleanField(),
    };
        
    return foundry.utils.mergeObject(superSchema, schema);
  }
}

export {
  ItemSystemModelBase,
};
