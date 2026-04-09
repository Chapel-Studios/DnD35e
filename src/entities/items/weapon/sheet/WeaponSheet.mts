import type { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';
import { ItemSheetDnd35e } from '@items/baseItem/index.mjs';
import type { PhysicalItemSheetRenderContext } from '@items/components/Physical/index.mjs';
import type { Weapon } from '@items/weapon/index.mjs';
import { WeaponSheetVue } from '@items/weapon/index.mjs';

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
