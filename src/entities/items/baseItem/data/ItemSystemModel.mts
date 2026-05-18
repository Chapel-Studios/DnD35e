import { DocumentSystemModel } from '@ec/CoreMixin/data/DocumentSystemModel.mjs';
import {
  requiredBooleanField,
  requiredStringField,
} from '@helpers/fieldBuilders.mjs';

import type { ItemSystemData } from './ItemSystemData.mjs';

const {
  SchemaField,
} = foundry.data.fields;

abstract class ItemSystemModel extends DocumentSystemModel<foundry.documents.Item> {
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

interface ItemSystemModel extends ItemSystemData {}

export {
  ItemSystemModel,
};
