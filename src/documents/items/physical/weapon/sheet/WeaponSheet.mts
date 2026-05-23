import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { ItemSheetDnd35e } from '@items/baseItem/index.mjs';
import type { PhysicalItemSheetRenderContext } from '@items/physical/physicalItem/index.mjs';
import type { Weapon } from '@items/physical/weapon/index.mjs';

import WeaponSheetVue from './WeaponSheet.vue';

type WeaponSheetConfig = DocumentSheetConfiguration<Weapon>;
type WeaponSheetRenderContext = PhysicalItemSheetRenderContext & {
  document: Weapon;
};

class WeaponSheet extends ItemSheetDnd35e {
  get vueComponent () {
    return WeaponSheetVue;
  }
}

export { WeaponSheet };
export type {
  WeaponSheetConfig,
  WeaponSheetRenderContext,
};
