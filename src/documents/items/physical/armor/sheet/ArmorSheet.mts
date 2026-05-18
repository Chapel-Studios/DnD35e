import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { ItemSheetDnd35e } from '@items/baseItem/index.mjs';
import type { Armor } from '@items/physical/armor/index.mjs';
import { ArmorSheetVue } from '@items/physical/armor/index.mjs';
import type { PhysicalItemSheetRenderContext } from '@items/physical/physicalItem/index.mjs';

type ArmorSheetConfig = DocumentSheetConfiguration<Armor>;
type ArmorSheetRenderContext = PhysicalItemSheetRenderContext & {
  document: Armor;
};

class ArmorSheet extends ItemSheetDnd35e {
  get vueComponent () {
    return ArmorSheetVue;
  }
}

export { ArmorSheet };
export type {
  ArmorSheetConfig,
  ArmorSheetRenderContext,
};
