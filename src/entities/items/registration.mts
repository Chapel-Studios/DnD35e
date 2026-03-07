import { ItemConfig } from '@constants/config/item.mjs';
import { ensureNameFormulaOnCreate } from '@ec/CoreMixin/index.mjs';
import { registerIntellisenseSchema } from '@helpers/formulae/index.mjs';
import { ItemProxyDnd35e } from '@items/baseItem/index.mjs';
import { weaponItemType } from '@items/itemTypes.mjs';
import { buildWeaponIntellisense, WeaponSheet, WeaponSystemModel } from '@items/weapon/index.mjs';

const registerItemSheets = () => {
  foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
  const itemSheets = [
    [weaponItemType, WeaponSheet],
  ] as const;

  for (const [type, Sheet] of itemSheets) {
    // @ts-expect-error - Mixin chain loses ApplicationV2 type relationship
    foundry.documents.collections.Items.registerSheet('dnd35e', Sheet, {
      types: [type],
      makeDefault: true,
    });
  }
};

export const registerItems = () => {
  CONFIG.Dnd35e.item = ItemConfig;
  foundry.helpers.Hooks.once('init', () => {
    CONFIG.Item.documentClass = ItemProxyDnd35e;
    Object.assign(CONFIG.Item.dataModels, {
      [weaponItemType]: WeaponSystemModel,
    });

    // Register intellisense schemas for formula resolution
    registerIntellisenseSchema('Item', weaponItemType, buildWeaponIntellisense);
  });

  foundry.helpers.Hooks.once('setup', () => {
    registerItemSheets();
  });

  Hooks.on('preCreateItem', (document, _data, _options, _userId) => {
    ensureNameFormulaOnCreate(document);
  });
};
