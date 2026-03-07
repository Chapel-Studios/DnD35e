import { EffectConfig } from '@constants/config/activeEffect.mjs';
import { ensureNameFormulaOnCreate } from '@ec/CoreMixin/index.mjs';
import { ActiveEffectProxyDnd35e } from '@effects/BaseActiveEffect/DnD35eActiveEffect.mjs';
import { MaterialSheet, MaterialSystemModel } from '@effects/material/index.mjs';

const registerEffectSheets = () => {
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
      }
    );
  }
};

export const registerEffects = () => {
  CONFIG.Dnd35e.activeEffect = EffectConfig;

  foundry.helpers.Hooks.once('init', () => {
    CONFIG.ActiveEffect.documentClass = ActiveEffectProxyDnd35e;
    Object.assign(CONFIG.ActiveEffect.dataModels, {
      material: MaterialSystemModel,
    });
  });

  foundry.helpers.Hooks.once('setup', () => {
    registerEffectSheets();
  });

  Hooks.on('preCreateActiveEffect', (document, _data, _options, _userId) => {
    ensureNameFormulaOnCreate(document);
  });
};

