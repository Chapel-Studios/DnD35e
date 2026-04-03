import { EffectConfig } from '@constants/config/activeEffect.mjs';
import { ensureNameFormulaOnCreate } from '@ec/CoreMixin/index.mjs';
import { ActiveEffectProxyDnd35e } from '@effects/BaseActiveEffect/DnD35eActiveEffect.mjs';
import { materialEffectType } from '@effects/material/index.mjs';
import { MaterialSheet, MaterialSystemModel } from '@effects/material/index.mjs';
import { gatherAspectsFromSchema, registerFamiliarSchema } from '@helpers/formulae/index.mjs';

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
  CONFIG.dnd35e.activeEffect = EffectConfig;

  foundry.helpers.Hooks.once('init', () => {
    CONFIG.ActiveEffect.documentClass = ActiveEffectProxyDnd35e;
    Object.assign(CONFIG.ActiveEffect.dataModels, {
      material: MaterialSystemModel,
    });

    // Register familiar schemas for formula resolution
    registerFamiliarSchema('ActiveEffect', materialEffectType, (context?) => gatherAspectsFromSchema(MaterialSystemModel, context));
  });

  foundry.helpers.Hooks.once('setup', () => {
    registerEffectSheets();
  });

  Hooks.on('preCreateActiveEffect', (document, _data, _options, _userId) => {
    ensureNameFormulaOnCreate(document);
  });
};

