import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import type { IdentifiableDocumentSheetRenderContext } from '@ec/Identifiable/index.mjs';
import { Dnd35eActiveEffectConfig } from '@effects/BaseActiveEffect/index.mjs';
import { Material } from '@effects/material/index.mjs';

import { MaterialSheetVue } from './index.mjs';

type MaterialSheetConfig = DocumentSheetConfiguration<Material>;
type MaterialSheetRenderContext = IdentifiableDocumentSheetRenderContext & {
  document: Material;
};

class MaterialSheet extends Dnd35eActiveEffectConfig {
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

