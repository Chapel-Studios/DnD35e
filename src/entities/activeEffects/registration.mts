import { EffectConfig } from '@constants/config/activeEffect.mjs';
import type { NameFormulaDocument } from '@ec/CoreMixin/index.mjs';
import { ensureNameFormulaOnCreate } from '@ec/CoreMixin/index.mjs';
import { EFFECT_CHANGE_PHASES } from '@effects/BaseActiveEffect/data/index.mjs';
import { ActiveEffectProxyDnd35e } from '@effects/BaseActiveEffect/DnD35eActiveEffect.mjs';
import { GENERAL_EFFECT_TYPE, GeneralSystemModel } from '@effects/general/index.mjs';
import { MaterialSystemModel } from '@effects/material/data/MaterialSystemModel.mjs';
import { validateSingleMaterial } from '@effects/material/Material.mjs';
import { materialEffectType } from '@effects/material/materialEffectType.mjs';
import { MaterialSheet } from '@effects/material/sheet/MaterialSheet.mjs';
import { SecretSystemModel } from '@effects/secret/data/SecretSystemModel.mjs';
import { secretEffectType } from '@effects/secret/secretEffectType.mjs';
import { SecretSheet } from '@effects/secret/sheet/SecretSheet.mjs';
import { gatherAspectsFromSchema, registerFamiliarSchema } from '@helpers/formulae/index.mjs';
import type { ItemDnd35e, ItemSheetStore } from '@items/baseItem/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

const syncOpenSheetTitle = (sheet: { rendered?: boolean; title?: string; window?: { title?: HTMLElement } } | null | undefined): void => {
  if (!sheet?.rendered) return;
  if (sheet.window?.title instanceof HTMLElement) {
    sheet.window.title.textContent = sheet.title ?? '';
  }
};

const refreshOwningItemForSecret = (document: unknown): void => {
  const effect = document as foundry.documents.ActiveEffect | null;
  if (!effect || effect.type !== secretEffectType) return;
  if (!effect.parent || effect.parent.documentName !== 'Item') return;

  const item = effect.parent as ItemDnd35e;
  item.prepareData();

  // TODO: Revisit secret hook refresh coverage for masked top-level fields like img.
  // Name is updated here today, but secret images and similar fields still need a
  // deliberate refresh path for directories/sidebar-style consumers when we return to it.

  if (item.id && game.dnd35e?.stores?.Item?.[item.id]) {
    (game.dnd35e.stores.Item[item.id] as ItemSheetStore<any>)?._storeUtils.refreshDocument?.(item);
  }

  syncOpenSheetTitle(item.sheet);
  // Re-render the item's own sheet so view-mode-bar `hasSecrets` and other
  // render-time samples (see VueDocumentSheetMixin#_onRender) refresh when a
  // Secret AE is added, updated, or removed. `force: false` makes this a no-op
  // when the sheet is closed.
  if (item.sheet?.rendered) item.sheet.render(false);
  // Also refresh the containing document (Actor sheet, sidebar) so embedded
  // displays of this item update their masked surfaces.
  item.parent?.sheet?.render(true);
};

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
    ...EffectConfig,
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
      [GENERAL_EFFECT_TYPE]: GeneralSystemModel,
      [materialEffectType]: MaterialSystemModel,
      [secretEffectType]: SecretSystemModel,
    });

    // Register familiar schemas for formula resolution
    registerFamiliarSchema('ActiveEffect', GENERAL_EFFECT_TYPE, (context?) => gatherAspectsFromSchema(GeneralSystemModel, context));
    registerFamiliarSchema('ActiveEffect', materialEffectType, (context?) => gatherAspectsFromSchema(MaterialSystemModel, context));
    registerFamiliarSchema('ActiveEffect', secretEffectType, (context?) => gatherAspectsFromSchema(SecretSystemModel, context));
  });

  foundry.helpers.Hooks.once('setup', () => {
    registerEffectSheets();
  });

  Hooks.on('preCreateActiveEffect', (document, _data, _options, _userId): false | void => {
    ensureNameFormulaOnCreate(document as NameFormulaDocument);

    if (validateSingleMaterial(document) === false) return false;
  });

  Hooks.on('createActiveEffect', (document) => {
    refreshOwningItemForSecret(document);
  });

  Hooks.on('updateActiveEffect', (document) => {
    refreshOwningItemForSecret(document);
  });

  Hooks.on('deleteActiveEffect', (document) => {
    refreshOwningItemForSecret(document);
  });
};

