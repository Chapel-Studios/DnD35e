import { registerCommon } from '@entities/common/index.mjs';
import { ItemProxyDnd35e } from './baseItem/index.mjs';
import { MaterialSystemModel, MaterialSheet } from './material/index.mjs';
import { WeaponSheet, WeaponSystemModel } from './weapon/index.mjs';
import ItemConfig from '@constants/config/item.mjs';

const registerSheets = () => {
  foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
  const itemSheets = [
    ['material', MaterialSheet],
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
  CONFIG.Dnd35e = {
    VERSION: '13.0.0-dev.1',
    item: ItemConfig,
  };

  foundry.helpers.Hooks.once('init', () => {
    CONFIG.Item.documentClass = ItemProxyDnd35e;
    Object.assign(CONFIG.Item.dataModels, {
      weapon: WeaponSystemModel,
      material: MaterialSystemModel,
    });
  });

  foundry.helpers.Hooks.once('setup', () => {
    registerCommon();
    registerSheets();
  });
};
