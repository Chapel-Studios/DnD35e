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
        originId: requiredStringField('D35E.OriginId', 'D35E.OriginIdHint'),
        originVersion: requiredStringField('D35E.OriginVersion', 'D35E.OriginVersionHint'),
        originPack: requiredStringField('D35E.OriginPack', 'D35E.OriginPackHint'),
      }, { required: false, nullable: true }),

      isPsionic: requiredBooleanField('D35E.IsPsionic', 'D35E.IsPsionicHint'),
      isEpic: requiredBooleanField('D35E.IsEpic', 'D35E.IsEpicHint'),
    };
        
    return foundry.utils.mergeObject(superSchema, schema);
  }
}

export {
  ItemSystemModelBase,
};
