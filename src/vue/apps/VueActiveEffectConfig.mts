import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import type { DnD35eActiveEffect } from '@entities/activeEffects/index.mjs';

import type { VueApplicationConfiguration, VueRenderOptions } from './VueAppTypes.mjs';
import { useVueDocumentSheetMixin } from './VueDocumentSheetMixin.mjs';

const EffectConfigBase = foundry.applications.sheets.ActiveEffectConfig<DnD35eActiveEffect, VueApplicationConfiguration<DnD35eActiveEffect>, VueRenderOptions>;

abstract class VueActiveEffectConfig extends useVueDocumentSheetMixin(EffectConfigBase) {
  static override get DEFAULT_OPTIONS (): DeepPartial<DocumentSheetConfiguration<DnD35eActiveEffect>> {
    return {
      classes: ['dnd35e', 'vueApp'],
      actions: {},
      position: {
        width: 985,
        height: 625,
      },
      window: {
        resizable: true,
      },
    } as DeepPartial<VueApplicationConfiguration<DnD35eActiveEffect>>;
  }
}

export { VueActiveEffectConfig };
