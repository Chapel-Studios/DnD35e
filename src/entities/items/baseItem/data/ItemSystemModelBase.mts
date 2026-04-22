import { Dnd35eDocumentSystemModel } from '@ec/CoreMixin/data/Dnd35eDocumentSystemModel.mjs';
import {
  requiredBooleanField,
  requiredStringField,
} from '@helpers/fieldBuilders.mjs';

import type { ItemSystemData } from './ItemSystemData.mjs';

const {
  SchemaField,
} = foundry.data.fields;

abstract class ItemSystemModelBase extends Dnd35eDocumentSystemModel<foundry.documents.Item> {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.ITEM'];

  static override defineSchema (): Record<string, any> {
    const superSchema = super.defineSchema();
    const schema = {
      origin: new SchemaField({
        originId: requiredStringField(),
        originVersion: requiredStringField(),
        originPack: requiredStringField(),
      }, { required: false, nullable: true }),

      isPsionic: requiredBooleanField(),
      isEpic: requiredBooleanField(),
    };
        
    return foundry.utils.mergeObject(superSchema, schema);
  }
}

interface ItemSystemModelBase extends ItemSystemData {}

export {
  ItemSystemModelBase,
};
