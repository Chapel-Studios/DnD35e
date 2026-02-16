import { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import { useVueMixin, VueApplicationConfiguration, VueRenderOptions } from '@vc/index.mjs';

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
      },
    } as DeepPartial<VueApplicationConfiguration<ItemDnd35e>>;
  }
}

export { VueItemSheet };
