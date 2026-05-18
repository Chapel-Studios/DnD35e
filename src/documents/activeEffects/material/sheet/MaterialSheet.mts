import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { ActiveEffectConfigDnd35e } from '@effects/BaseActiveEffect/sheet/ActiveEffectConfigDnd35e.mjs';
import { Material } from '@effects/material/Material.mjs';

import MaterialSheetVue from './MaterialSheet.vue';

type MaterialSheetConfig = DocumentSheetConfiguration<Material>;
type MaterialSheetRenderContext = {
  document: Material;
};

class MaterialSheet extends ActiveEffectConfigDnd35e {
  get vueComponent () {
    return MaterialSheetVue;
  }

  // static override get DEFAULT_OPTIONS(): DeepPartial<VueApplicationConfiguration> {
  //   return {
  //     // id: 'dnd35e-material-sheet', // this probably should be unique
  //     tag: 'form',
  //     form: {
  //       submitOnChange: true,
  //     },
  //     window: {
  //       resizable: true,
  //     },
  //   };
  // }

  // declare showUnIdentifiedDescriptionEditor: boolean;
}

export {
  MaterialSheet,
};

export type {
  MaterialSheetConfig,
  MaterialSheetRenderContext,
};

