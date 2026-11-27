import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { ItemSheetDnd35e } from '@items/baseItem/index.mjs';
import type { PhysicalItemSheetRenderContext } from '@items/physical/physicalItem/sheet/index.mjs';

import type { Ammo } from '../Ammo.mjs';
import AmmoSheetVue from './AmmoSheet.vue';

type AmmoSheetConfig = DocumentSheetConfiguration<Ammo>;
type AmmoSheetRenderContext = PhysicalItemSheetRenderContext & {
  document: Ammo;
};

class AmmoSheet extends ItemSheetDnd35e {
  get vueComponent() {
    return AmmoSheetVue;
  }
}

export type {
  AmmoSheetConfig,
  AmmoSheetRenderContext,
};
export {
  AmmoSheet,
};
