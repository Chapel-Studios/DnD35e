import { gatherAspectsFromSchema, registerFamiliarSchema } from '@helpers/formulae/index.mjs';
import { ItemProxyDnd35e } from '@items/baseItem/index.mjs';
import { containerItemType, weaponItemType } from '@items/itemTypes.mjs';
import { Container, ContainerSheet, ContainerSystemModel } from '@items/physical/container/index.mjs';
import { Weapon, WeaponSheet, WeaponSystemModel } from '@items/physical/weapon/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

const registerItemSheets = () => {
  foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
  const itemSheets = [
    [weaponItemType, WeaponSheet],
    [containerItemType, ContainerSheet],
  ] as const;

  for (const [type, Sheet] of itemSheets) {
    foundry.documents.collections.Items.registerSheet(SYSTEM_ID, Sheet, {
      types: [type],
      makeDefault: true,
    });
  }
};

export const registerItems = () => {
  CONFIG.dnd35e.item = {
    ...CONFIG.dnd35e.item,
    documentClasses: {
      weapon: Weapon,
      container: Container,
    },
  };
  foundry.helpers.Hooks.once('init', () => {
    CONFIG.Item.documentClass = ItemProxyDnd35e;
    Object.assign(CONFIG.Item.dataModels, {
      [weaponItemType]: WeaponSystemModel,
      [containerItemType]: ContainerSystemModel,
    });

    // Register familiar schemas for formula resolution
    registerFamiliarSchema('Item', weaponItemType, (ctx?) => gatherAspectsFromSchema(WeaponSystemModel, ctx));
    registerFamiliarSchema('Item', containerItemType, (ctx?) => gatherAspectsFromSchema(ContainerSystemModel, ctx));
  });

  foundry.helpers.Hooks.once('setup', () => {
    registerItemSheets();
  });
};
