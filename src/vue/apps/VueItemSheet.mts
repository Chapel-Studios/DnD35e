import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';

import type { VueApplicationConfiguration, VueRenderOptions } from './index.mjs';
import { useVueMixin } from './index.mjs';

const ItemSheetBase = foundry.applications.sheets.ItemSheetV2<ItemDnd35e, VueApplicationConfiguration<ItemDnd35e>, VueRenderOptions>;

abstract class VueItemSheet extends useVueMixin(ItemSheetBase) {
  static override get DEFAULT_OPTIONS (): DeepPartial<DocumentSheetConfiguration<ItemDnd35e>> {
    return {
      classes: ['dnd35e', 'vueApp'],
      actions: {},
      position: {
        width: 560,
        height: 650,
      },
      window: {
        resizable: true,
      },
    } as DeepPartial<VueApplicationConfiguration<ItemDnd35e>>;
  }
}

export { VueItemSheet };
