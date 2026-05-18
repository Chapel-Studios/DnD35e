import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { VUE_APP_CLASS } from '@constants/cssClasses.mjs';
import type { ActiveEffectDnd35e } from '@documents/activeEffects/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import type { VueApplicationConfiguration, VueRenderOptions } from './VueAppTypes.mjs';
import { useVueDocumentSheetMixin } from './VueDocumentSheetMixin.mjs';

const EffectConfigBase = foundry.applications.sheets.ActiveEffectConfig<ActiveEffectDnd35e, VueApplicationConfiguration<ActiveEffectDnd35e>, VueRenderOptions>;

abstract class VueActiveEffectConfig extends useVueDocumentSheetMixin(EffectConfigBase) {
  static override get DEFAULT_OPTIONS (): DeepPartial<DocumentSheetConfiguration<ActiveEffectDnd35e>> {
    return {
      classes: [SYSTEM_ID, VUE_APP_CLASS],
      actions: {},
      position: {
        width: 985,
        height: 625,
      },
      window: {
        resizable: true,
      },
    } as DeepPartial<VueApplicationConfiguration<ActiveEffectDnd35e>>;
  }
}

export { VueActiveEffectConfig };
