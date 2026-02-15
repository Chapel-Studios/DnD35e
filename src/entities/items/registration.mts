import { ItemProxyDnd35e } from '@items/baseItem/index.mjs';
import { MaterialSystemModel, MaterialSheet } from '@itemEffects/material/index.mjs';
import { Weapon, WeaponSheet, WeaponSystemModel } from '@items/weapon/index.mjs';

const registerSheets = () => {
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
  CONFIG.Dnd35e.item.documentClasses = {
    weapon: Weapon,
  };

  foundry.helpers.Hooks.once('init', () => {
    CONFIG.Item.documentClass = ItemProxyDnd35e;
    Object.assign(CONFIG.Item.dataModels, {
      weapon: WeaponSystemModel,
      material: MaterialSystemModel,
    });
  });

  foundry.helpers.Hooks.once('setup', () => {
    registerSheets();
  });
};
