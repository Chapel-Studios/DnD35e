import { Material, MaterialSheet, MaterialSystemModel } from '@itemEffects/material/index.mjs';
import { ActiveEffectProxyDnd35e } from '@effects/BaseActiveEffect/DnD35eActiveEffect.mjs';

const registerSheets = () => {
  const effectSheets = [
    ['material', MaterialSheet],
  ] as const;

  for (const [effectType, Sheet] of effectSheets) {
    foundry.applications.apps.DocumentSheetConfig.registerSheet(
      foundry.documents.ActiveEffect,
      'dnd35e',
      Sheet,
      {
        types: [effectType],
        makeDefault: true,
      },
    );
  }
};

export const registerEffects = () => {
  CONFIG.Dnd35e.activeEffect = {
    documentClasses: {
      material: Material,
    },
  };

  foundry.helpers.Hooks.once('init', () => {
    CONFIG.ActiveEffect.documentClass = ActiveEffectProxyDnd35e;
    Object.assign(CONFIG.ActiveEffect.dataModels, {
      material: MaterialSystemModel,
    });
  });

  foundry.helpers.Hooks.once('setup', () => {
    registerSheets();
  });
};

