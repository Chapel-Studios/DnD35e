import { ItemConfig } from '@constants/config/item.mjs';
import { ItemProxyDnd35e } from '@items/baseItem/index.mjs';
import { WeaponSheet, WeaponSystemModel } from '@items/weapon/index.mjs';

const registerItemSheets = () => {
  foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
  const itemSheets = [
    ['weapon', WeaponSheet],
  ] as const;

  for (const [type, Sheet] of itemSheets) {
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
      weapon: WeaponSystemModel,
    });
  });

  foundry.helpers.Hooks.once('setup', () => {
    registerItemSheets();
  });
};
