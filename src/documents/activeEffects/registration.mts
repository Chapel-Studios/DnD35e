import { ActiveEffectProxyDnd35e } from '@effects/baseActiveEffect/ActiveEffectDnd35e.mjs';
import { EFFECT_CHANGE_PHASES } from '@effects/baseActiveEffect/data/index.mjs';
import { containmentEffectType } from '@effects/containment/containmentEffectType.mjs';
import { Containment, ContainmentSystemModel } from '@effects/containment/index.mjs';
import { GENERAL_EFFECT_TYPE, GeneralEffectSystemModel } from '@effects/general/index.mjs';
import { MaterialSystemModel } from '@effects/material/data/MaterialSystemModel.mjs';
import { Material } from '@effects/material/Material.mjs';
import { materialEffectType } from '@effects/material/materialEffectType.mjs';
import { MaterialSheet } from '@effects/material/sheet/MaterialSheet.mjs';
import { SecretSystemModel } from '@effects/secret/data/SecretSystemModel.mjs';
import { secretEffectType } from '@effects/secret/secretEffectType.mjs';
import { SecretSheet } from '@effects/secret/sheet/SecretSheet.mjs';
import { gatherAspectsFromSchema, registerFamiliarSchema } from '@helpers/formulae/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

import { Secret } from './secret/index.mjs';
const registerEffectSheets = () => {
  const effectSheets = [
    [materialEffectType, MaterialSheet],
    [secretEffectType, SecretSheet],
  ] as const;

  for (const [effectType, Sheet] of effectSheets) {
    foundry.applications.apps.DocumentSheetConfig.registerSheet(
      foundry.documents.ActiveEffect,
      SYSTEM_ID,
      Sheet,
      {
        types: [effectType],
        makeDefault: true,
      }
    );
  }
};

export const registerEffects = () => {
  CONFIG.dnd35e.activeEffect = {
    ...CONFIG.dnd35e.activeEffect,
    documentClasses: {
      material: Material,
      secret: Secret,
      containment: Containment,
    },
  };

  foundry.helpers.Hooks.once('init', () => {
    CONFIG.ActiveEffect.documentClass = ActiveEffectProxyDnd35e;

    // Register custom phases (core, initial, final)
    CONFIG.ActiveEffect.phases = EFFECT_CHANGE_PHASES;

    // Disable legacy transferral behavior
    CONFIG.ActiveEffect.legacyTransferral = false;

    // Default new AEs to 'general' type instead of 'base'
    CONFIG.ActiveEffect.defaultType = GENERAL_EFFECT_TYPE;

    // Register FormulaFamiliar change type (handler deferred to Phase 7)
    const changeTypes = ((CONFIG.ActiveEffect as Record<string, unknown>).changeTypes ??= {}) as Record<string, unknown>;
    changeTypes.familiar = {
      label: 'dnd35e.EFFECT.ChangeMode.Familiar',
      defaultPriority: 50,
      handler: null,
    };
    // MASK change type — Secret AEs use this to define masked values. Not applied via applyChange().
    changeTypes.mask = {
      label: 'dnd35e.EFFECT.ChangeMode.Mask',
      defaultPriority: 10,
      handler: null,
    };

    // Register system AE data models
    Object.assign(CONFIG.ActiveEffect.dataModels, {
      [GENERAL_EFFECT_TYPE]: GeneralEffectSystemModel,
      [materialEffectType]: MaterialSystemModel,
      [secretEffectType]: SecretSystemModel,
      [containmentEffectType]: ContainmentSystemModel,
    });

    // Register familiar schemas for formula resolution
    registerFamiliarSchema('ActiveEffect', GENERAL_EFFECT_TYPE, (context?) => gatherAspectsFromSchema(GeneralEffectSystemModel, context));
    registerFamiliarSchema('ActiveEffect', materialEffectType, (context?) => gatherAspectsFromSchema(MaterialSystemModel, context));
    registerFamiliarSchema('ActiveEffect', secretEffectType, (context?) => gatherAspectsFromSchema(SecretSystemModel, context));
    registerFamiliarSchema('ActiveEffect', containmentEffectType, (context?) => gatherAspectsFromSchema(ContainmentSystemModel, context));
  });

  foundry.helpers.Hooks.once('setup', () => {
    registerEffectSheets();
  });
};

