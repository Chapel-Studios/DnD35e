import { ItemConfig } from '@constants/config/item.mjs';
import type { NameFormulaDocument } from '@ec/CoreMixin/index.mjs';
import { ensureNameFormulaOnCreate } from '@ec/CoreMixin/index.mjs';
import { gatherAspectsFromSchema, registerFamiliarSchema } from '@helpers/formulae/index.mjs';
import type { ItemSheetStore } from '@items/baseItem/index.mjs';
import { ItemProxyDnd35e } from '@items/baseItem/index.mjs';
import { weaponItemType } from '@items/itemTypes.mjs';
import { WeaponSheet, WeaponSystemModel } from '@items/weapon/index.mjs';

const registerItemSheets = () => {
  foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
  const itemSheets = [
    [weaponItemType, WeaponSheet],
  ] as const;

  for (const [type, Sheet] of itemSheets) {
    foundry.documents.collections.Items.registerSheet('dnd35e', Sheet, {
      types: [type],
      makeDefault: true,
    });
  }
};

export const registerItems = () => {
  CONFIG.dnd35e.item = ItemConfig;
  foundry.helpers.Hooks.once('init', () => {
    CONFIG.Item.documentClass = ItemProxyDnd35e;
    Object.assign(CONFIG.Item.dataModels, {
      [weaponItemType]: WeaponSystemModel,
    });

    // Register familiar schemas for formula resolution
    registerFamiliarSchema('Item', weaponItemType, (ctx?) => gatherAspectsFromSchema(WeaponSystemModel, ctx));
  });

  foundry.helpers.Hooks.once('setup', () => {
    registerItemSheets();
  });

  Hooks.on('preCreateItem', (document, _data, _options, _userId) => {
    ensureNameFormulaOnCreate(document as NameFormulaDocument);
  });

  Hooks.on('updateItem', (document, _updateData, _options, _userId) => {
    if (!document._id || !game.dnd35e?.stores?.[document.documentName]?.[document._id]) return;
    (game.dnd35e.stores[document.documentName]?.[document._id] as ItemSheetStore<any>)?._storeUtils.refreshDocument?.(document);
  });
};
