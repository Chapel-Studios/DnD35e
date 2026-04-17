import { EffectConfig } from '@constants/config/activeEffect.mjs';
import type { NameFormulaDocument } from '@ec/CoreMixin/index.mjs';
import { ensureNameFormulaOnCreate } from '@ec/CoreMixin/index.mjs';
import { EFFECT_CHANGE_PHASES } from '@effects/BaseActiveEffect/data/index.mjs';
import { ActiveEffectProxyDnd35e } from '@effects/BaseActiveEffect/DnD35eActiveEffect.mjs';
import { GENERAL_EFFECT_TYPE, GeneralSystemModel } from '@effects/general/index.mjs';
import { materialEffectType } from '@effects/material/index.mjs';
import { MaterialSheet, MaterialSystemModel } from '@effects/material/index.mjs';
import { gatherAspectsFromSchema, registerFamiliarSchema } from '@helpers/formulae/index.mjs';

const registerEffectSheets = () => {
  const effectSheets = [
    [materialEffectType, MaterialSheet],
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

    // Register custom phases (core, initial, final)
    CONFIG.ActiveEffect.phases = EFFECT_CHANGE_PHASES;

    // Disable legacy transferral behavior
    CONFIG.ActiveEffect.legacyTransferral = false;

    // Default new AEs to 'general' type instead of 'base'
    CONFIG.ActiveEffect.defaultType = GENERAL_EFFECT_TYPE;

    // Register system AE data models
    Object.assign(CONFIG.ActiveEffect.dataModels, {
      [GENERAL_EFFECT_TYPE]: GeneralSystemModel,
      [materialEffectType]: MaterialSystemModel,
    });

    // Register familiar schemas for formula resolution
    registerFamiliarSchema('ActiveEffect', GENERAL_EFFECT_TYPE, (context?) => gatherAspectsFromSchema(GeneralSystemModel, context));
    registerFamiliarSchema('ActiveEffect', materialEffectType, (context?) => gatherAspectsFromSchema(MaterialSystemModel, context));
  });

  foundry.helpers.Hooks.once('setup', () => {
    registerEffectSheets();
  });

  Hooks.on('preCreateActiveEffect', (document, _data, _options, _userId) => {
    ensureNameFormulaOnCreate(document as NameFormulaDocument);
  });
};

