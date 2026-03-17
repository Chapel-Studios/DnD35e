import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';

import type { VueApplicationConfiguration, VueRenderOptions } from './VueAppTypes.mjs';
import { useVueDocumentSheetMixin } from './VueDocumentSheetMixin.mjs';

const ItemSheetBase = foundry.applications.sheets.ItemSheetV2<ItemDnd35e, VueApplicationConfiguration<ItemDnd35e>, VueRenderOptions>;

abstract class VueItemSheet extends useVueDocumentSheetMixin(ItemSheetBase) {
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

  override async _onDrop(event: DragEvent): Promise<void> {
    super._onDrop(event);
    game.dnd35e.stores.items[this.document.id]?._storeUtils.refreshDocument();
  }
}

export { VueItemSheet };
