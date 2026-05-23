import { DocumentSystemModel } from '@documents/document/data/DocumentSystemModel.mjs';
import {
  requiredBooleanField,
} from '@fields/fieldBuilders.mjs';

import type { ItemSystemData } from './ItemSystemData.mjs';

abstract class ItemSystemModel extends DocumentSystemModel<foundry.documents.Item> {
  static override LOCALIZATION_PREFIXES = [...super.LOCALIZATION_PREFIXES, 'dnd35e.ITEM'];

  static override defineSchema (): Record<string, any> {
    const superSchema = super.defineSchema();
    const schema = {
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
