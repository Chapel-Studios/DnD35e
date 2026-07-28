import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { ActiveEffectConfigDnd35e } from '@effects/baseActiveEffect/sheet/ActiveEffectConfigDnd35e.mjs';
import type { General } from '@effects/general/General.mjs';

import GeneralSheetVue from './GeneralSheet.vue';

type GeneralSheetConfig = DocumentSheetConfiguration<General>;
type GeneralSheetRenderContext = {
  document: General;
};

class GeneralSheet extends ActiveEffectConfigDnd35e {
  get vueComponent () {
    return GeneralSheetVue;
  }
}

export {
  GeneralSheet,
};

export type {
  GeneralSheetConfig,
  GeneralSheetRenderContext,
};
