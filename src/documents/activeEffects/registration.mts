import { EffectConfig } from '@constants/config/activeEffect.mjs';
import type { NameFormulaDocument } from '@documents/document/index.mjs';
import { ensureNameFormulaOnCreate } from '@documents/document/index.mjs';
import { ActiveEffectProxyDnd35e } from '@effects/baseActiveEffect/ActiveEffectDnd35e.mjs';
import { EFFECT_CHANGE_PHASES } from '@effects/baseActiveEffect/data/index.mjs';
import { GENERAL_EFFECT_TYPE, GeneralSystemModel } from '@effects/general/index.mjs';
import { MaterialSystemModel } from '@effects/material/data/MaterialSystemModel.mjs';
import { validateSingleMaterial } from '@effects/material/Material.mjs';
import { materialEffectType } from '@effects/material/materialEffectType.mjs';
import { MaterialSheet } from '@effects/material/sheet/MaterialSheet.mjs';
import { SecretSystemModel } from '@effects/secret/data/SecretSystemModel.mjs';
import { secretEffectType } from '@effects/secret/secretEffectType.mjs';
import { SecretSheet } from '@effects/secret/sheet/SecretSheet.mjs';
import { gatherAspectsFromSchema, registerFamiliarSchema } from '@helpers/formulae/index.mjs';
import { syncOpenSheetTitle } from '@helpers/syncOpenSheetTitle.mjs';
import type { ItemDnd35e, ItemSheetStore } from '@items/baseItem/index.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';

const refreshOwningDocument = (document: unknown): void => {
  const effect = document as foundry.documents.ActiveEffect | null;
  const parent = effect?.parent;
  if (!parent || !parent.id || !parent.documentName) return;

  // Re-run prepareData so derived data (e.g. system.isBroken, secret-driven
  // name/img) recomputes from the current set of effects.
  (parent as { prepareData?: () => void }).prepareData?.();

  const stores = game.dnd35e?.stores as unknown as Record<string, Record<string, ItemSheetStore<any>>> | undefined;
  const store = stores?.[parent.documentName]?.[parent.id];
  store?._storeUtils.refreshDocument?.(parent as ItemDnd35e);

  // Sync the open sheet's window title (secret-driven name changes etc.)
  // TODO: Revisit secret hook refresh coverage for masked top-level fields like img.
  // Name is updated here today, but secret images and similar fields still need a
  // deliberate refresh path for directories/sidebar-style consumers when we return to it.
  const sheet = (parent as { sheet?: foundry.applications.api.ApplicationV2 | null }).sheet;
  if (sheet) syncOpenSheetTitle(sheet);

  // Re-render the parent's own sheet so view-mode-bar `hasSecrets` and other
  // render-time computed state refresh (see VueDocumentSheetMixin#_onRender).
  // `force: false` is a no-op when closed.
  if (sheet?.rendered) sheet.render(false);

  // Also refresh the grand-parent (e.g. Actor sheet showing this item) so
  // embedded displays update their masked surfaces.
  const grandParent = (parent as { parent?: { sheet?: foundry.applications.api.ApplicationV2 | null } }).parent;
  grandParent?.sheet?.render(true);
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
    refreshOwningDocument(document);
  });

  Hooks.on('updateActiveEffect', (document) => {
    refreshOwningDocument(document);
  });

  Hooks.on('deleteActiveEffect', (document) => {
    refreshOwningDocument(document);
  });
};

