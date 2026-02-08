import { Weapon, WeaponSheetVue } from '@items/weapon/index.mjs';
import { ItemSheetDnd35e } from '@items/baseItem/index.mjs';
import { PhysicalItemSheetRenderContext } from '@items/components/Physical/index.mjs';
import { DocumentSheetConfiguration } from '@client/applications/api/document-sheet.mjs';

type WeaponSheetConfig = DocumentSheetConfiguration<Weapon>;
type WeaponSheetRenderContext = PhysicalItemSheetRenderContext & {
  document: Weapon;
};

class WeaponSheet extends ItemSheetDnd35e<Weapon> {
  get vueComponent () {
    return WeaponSheetVue;
  }

  // class WeaponSheet extends foundry.applications.api.HandlebarsApplicationMixin(PhysicalItemSheet<WeaponDnd35e, WeaponSheetConfig>) {
  //   static override DEFAULT_OPTIONS: DeepPartial<DocumentSheetConfiguration> = {
  //     tag: 'form',
  //     id: 'dnd35e-weapon-sheet', // this probably should be unique
  //     form: {
  //       submitOnChange: true,
  //     },
  //     window: {
  //       resizable: true,
  //     },
  //     position: {
  //       width: 600,
  //       height: 400,
  //     },
  //   };

  //   override async _prepareContext (options: DocumentSheetRenderOptions): Promise<WeaponSheetRenderContext> {
  //     const baseContext = await super._prepareContext(options) as PhysicalItemSheetRenderContext;
  //     baseContext.partials.headerSummary = weaponSummaryPartialName;
  //     baseContext.partials.headerStatus = defaultHeaderStatusPartialName;

//     return baseContext;
//   }
}

export { WeaponSheet };
export type {
  WeaponSheetConfig,
  WeaponSheetRenderContext,
};
