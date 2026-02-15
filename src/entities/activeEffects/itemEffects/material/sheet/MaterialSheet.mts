import { ItemSheetDnd35e } from '@items/baseItem/index.mjs';
import { MaterialSheetVue } from './index.mjs';
import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { Material } from '@effects/material/index.mjs';
import type { IdentifiableItemSheetRenderContext } from '@ec/Identifiable/index.mjs';

type MaterialSheetConfig = DocumentSheetConfiguration<Material>;
type MaterialSheetRenderContext = IdentifiableItemSheetRenderContext & {
  document: Material;
};

class MaterialSheet extends ItemSheetDnd35e<Material> {
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
