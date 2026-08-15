import type { ActorType } from '@actors/actorTypes.mjs';
import type { ActorDnd35e } from '@actors/baseActor/ActorDnd35e.mjs';
import type { DatabaseUpdateOperation } from '@common/abstract/_types.mjs';
import { MASKED_EDIT_STRATEGY, type MaskedEditStrategy } from '@constants/fields.mjs';
import type { PreparationWarning } from '@documents/document/preparationWarnings.mjs';
import { EFFECT_CHANGE_TARGET } from '@effects/baseActiveEffect/data/constants.mjs';
import { resolveMaskedActiveEffectChangeValue } from '@effects/baseActiveEffect/logic/resolveChangeValue.mjs';
import type { ActiveEffectDnd35e, EffectType } from '@effects/index.mjs';
import { addOrUpdatePlayerEditMask, findOrCreatePlayerEditSecret } from '@effects/secret/playerEditSecret.mjs';
import { getSchemaField } from '@fields/getSchemaField.mjs';
import { buildDocumentFamiliar } from '@helpers/formulae/index.mjs';
import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/itemTypes.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import type {
  FieldEditability,
  FieldVisibility,
} from '@vc/fields/formGroups/fieldPermissions.mjs';
import {
  everyoneVisibility,
  gmOnlyEditability,
  gmOnlyVisibility,
  normalEditability,
  ownerPlusVisibility,
} from '@vc/fields/formGroups/fieldPermissions.mjs';
import type { VueApplicationContext } from '@vueApps/index.mjs';
import type { ComputedRef, ShallowRef } from 'vue';
import { computed, inject, provide, reactive, ref, shallowRef, triggerRef, unref } from 'vue';

import { routeMaskedFieldEdit } from './maskedFieldRouting.mjs';
import { buildMaskMapFromSecretEffects } from './maskMap.mjs';
import type {
  FieldOverridesStoreActions,
  FieldOverridesStoreGetters,
  FieldOverridesStoreUtils,
  RenderModeStore,
  SheetTab,
  TabStore,
} from './stores/index.mjs';
import { RenderModeStoreSymbol, TabStoreSymbol, useFieldOverridesStore, useTabStore } from './stores/index.mjs';
import type { EvaluationDocument, FormulaRegistration } from './types.mjs';
import { resolveViewAwareFieldPlan } from './viewAwareFieldPlan.mjs';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SheetDocument = ItemDnd35e | ActiveEffectDnd35e | ActorDnd35e;

type DocumentSheetStoreUtils<TDocument extends SheetDocument> = FieldOverridesStoreUtils & {
  document: ShallowRef<TDocument>;
  updateDocument: (data: Record<string, unknown>, options?: Partial<DatabaseUpdateOperation<TDocument>>) => Promise<boolean>;
  updateFlag: (key: string, value: unknown) => Promise<boolean>;
  getProperty: <T>(path: string) => ComputedRef<T>;
  getSourceProperty: <T>(path: string) => ComputedRef<T>;
  getFlagValue: <T>(flagPath: string) => T;

  setGetFreshDocument: (fn: (uuid: string) => Promise<TDocument | null>) => void;
  refreshDocument: (doc?: TDocument | null) => Promise<void>;
  refreshContext: (context: VueApplicationContext<TDocument> | undefined) => void;

  enrichHTML: (content: string) => Promise<string>;
  createLocalizedComputed: (text: string) => ComputedRef<string>;
  tabStore: TabStore;
  /** The RenderModeStore this store was built with - either injected from the ambient
   * Vue app, or an explicit override (see `useDocumentSheetStore`'s `options.renderModeStore`).
   * Exposed so callers building row/child-scoped stores from outside their own component
   * (e.g. `ActorSheetStore.getOrCreateItemRowStore`) can forward the SAME instance instead
   * of relying on ambient `inject()` resolving correctly at that call site. */
  renderModeStore: RenderModeStore;
};

type DocumentSheetStoreDocumentGetters = FieldOverridesStoreGetters & {
  // Getter Functions
  getIsFieldVisible: (fieldPath: string, defaultVisibility?: FieldVisibility) => ComputedRef<boolean>;
  getIsFieldEditable: (fieldPath: string, defaultEditability?: FieldEditability, allowForceEdit?: boolean) => ComputedRef<boolean>;
  getViewAwareFieldValue: <T>(fieldPath: string, getFromSource?: boolean) => T;
  hasMaskForField: (fieldPath: string) => ComputedRef<boolean>;
  getMaskForField: <T = unknown>(fieldPath: string) => ComputedRef<T | undefined>;

  type: ComputedRef<ItemType | ActorType | EffectType>;
  documentName: ComputedRef<foundry.CONST.DocumentType>;
  localizedType: ComputedRef<string>;
  name: ComputedRef<string>;
  nameFormula: ComputedRef<string>;
  img: ComputedRef<string>;
  systemSlug: ComputedRef<string>;
  documentUuid: ComputedRef<string>;
  documentId: ComputedRef<string>;
  description: ComputedRef<string>;
  parentUuid: ComputedRef<string | null>;
  getEffectsForField: (fieldPath: string) => ComputedRef<object[]>;
  hasEffectsForField: (fieldPath: string) => ComputedRef<boolean>;
  familiarSchema: ComputedRef<FamiliarSchema>;
  /** Diagnostics from this document's own last prep cycle - actors additionally aggregate owned items' warnings, see `ActorSheetStore`. */
  preparationWarnings: ComputedRef<PreparationWarning[]>;
};

type DocumentSheetStoreDocumentActions<TDocument extends SheetDocument> = FieldOverridesStoreActions & {
  // updateDocument: (data: Record<string, unknown>, options?: Partial<DatabaseUpdateOperation<TDocument>>) => Promise<boolean>;
  viewModeAwareUpdateDocument: (data: Record<string, unknown>, options?: Partial<DatabaseUpdateOperation<TDocument>>) => Promise<boolean>;
  getViewAwareFieldUpdater: (path: string, options?: Partial<DatabaseUpdateOperation<TDocument>>) => (value: unknown) => Promise<boolean>;
  updateFlag: (key: string, value: unknown) => Promise<boolean>;
};

type DocumentSheetStore<TDocument extends SheetDocument = SheetDocument> = {
  isFirstRender: ComputedRef<boolean | undefined>;
  _storeUtils: DocumentSheetStoreUtils<TDocument>;
  documentGetters: DocumentSheetStoreDocumentGetters;
  documentActions: DocumentSheetStoreDocumentActions<TDocument>;
  isGM: ComputedRef<boolean>;
  isOwnerOrGM: ComputedRef<boolean>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface BaseSheetState {
  isEditable: boolean;
  renderOptions: { isFirstRender?: boolean } | undefined;
}

const createBaseState = (): BaseSheetState => ({
  isEditable: false,
  renderOptions: undefined,
});

const { EmbeddedDataField } = foundry.data.fields;

// ---------------------------------------------------------------------------
// Composable
// ---------------------------------------------------------------------------

/**
 * Creates the base document sheet store with shared functionality for tabs and document management.
 * This is used by both useItemSheetStore and useActiveEffectConfigStore.
 */
const useDocumentSheetStore = <TDocument extends SheetDocument>(
  context: VueApplicationContext<TDocument>,
  options: {
    defaultTabs?: SheetTab[];
    defaultActiveTab?: string;
    /** Explicit RenderModeStore to use instead of `inject()`-ing the ambient one. Row/child-
     * scoped stores built from a parent store's own closure (not from within their own
     * component's synchronous setup) must pass the parent's own instance here rather than
     * relying on Vue's ambient provide/inject, which only resolves correctly at the exact
     * call site of the composable. */
    renderModeStore?: RenderModeStore;
  } = {}
): DocumentSheetStore<TDocument> => {

  // --- Core state ---
  const document = shallowRef(context.document);
  const state = reactive({
    ...createBaseState(),
    renderOptions: unref(context.renderOptions),
  });

  const renderModeStore = options.renderModeStore ?? (inject(RenderModeStoreSymbol) as RenderModeStore);
  const {
    isPlayMode,
    isEditMode,
    isTrueMode,
    isOwnerOrGM,
    isGM,
  } = renderModeStore;

  // --- Core actions ---
  const updateDocument = async (
    data: Record<string, unknown>,
    options: Partial<DatabaseUpdateOperation<TDocument>> = {}
  ) => {
    const updatedDoc = await document.value.update(data, options) as TDocument;
    if (updatedDoc) {
      document.value = updatedDoc;
      triggerRef(document);
      return true;
    }
    return false;
  };

  const updateFlag = async (key: string, value: unknown): Promise<boolean> => {
    try {
      await document.value.setFlag(SYSTEM_ID, key, value);
      triggerRef(document);
      return true;
    } catch (err) {
      console.error(`updateFlag('${key}'): error`, err);
      return false;
    }
  };

  // --- Composed stores ---
  const {
    fieldOverridesGetters,
    fieldOverridesUtils,
    fieldOverridesActions,
  } = useFieldOverridesStore({ document, updateFlag });

  const tabStore = useTabStore({
    defaultTabs: options.defaultTabs,
    defaultActiveTab: options.defaultActiveTab,
  });

  provide(TabStoreSymbol, tabStore);

  // -- Major Functions

  const viewModeAwareUpdateDocument = async (
    updateData: Record<string, unknown>,
    options: Partial<DatabaseUpdateOperation<TDocument>> = {}
  ) => {
    if (document.value.documentName === 'Item' || document.value.documentName === 'Actor') {
      const masks = documentMasks.value;
      if (masks) {
        const normalFields: Record<string, unknown> = {};
        const playerMaskFields: Record<string, unknown> = {};

        for (const [fieldPath, nextValue] of Object.entries(updateData)) {
          const hasMask = fieldPath in masks;

          if (
            !hasMask
            || !isFieldMaskable(fieldPath)
          ) {
            normalFields[fieldPath] = nextValue;
            continue;
          }

          const strategy = getFieldMaskedEditStrategy(fieldPath);
          const routed = routeMaskedFieldEdit({
            strategy,
            isPlayMode: isPlayMode.value,
            nextValue,
            sourceValue: foundry.utils.getProperty(document.value, `_source.${fieldPath}`),
            maskValue: masks[fieldPath],
          });

          if (routed.usedFallback) {
            console.warn(`[DocumentSheetStore] deltaMirror requires numeric values at ${fieldPath}; falling back to default routing.`);
          }

          if (routed.normalValue !== undefined) {
            normalFields[fieldPath] = routed.normalValue;
          }
          if (routed.playerMaskValue !== undefined) {
            playerMaskFields[fieldPath] = routed.playerMaskValue;
          }
        }

        if (Object.keys(playerMaskFields).length > 0) {
          const maskHost = document.value as unknown as ItemDnd35e | ActorDnd35e;
          const secret = await findOrCreatePlayerEditSecret(maskHost);
          for (const [fieldPath, value] of Object.entries(playerMaskFields)) {
            await addOrUpdatePlayerEditMask(secret, fieldPath, value);
          }
        }

        if (Object.keys(normalFields).length > 0) {
          return await updateDocument(normalFields, options);
        }
        if (Object.keys(playerMaskFields).length > 0) {
          return true;
        }
      }
    }

    return await updateDocument(updateData, options);
  };

  // --- Overridable implementations (replaced by extending stores via _storeUtils) ---

  const _getFreshDocumentImpl = ref<(uuid: string) => Promise<TDocument | null>>(
    async (_uuid: string): Promise<TDocument | null> => {
      console.error('getFreshDocument is not implemented for this store');
      return null;
    }
  );

  // --- Getters ---

  const getFlagValue = <T,>(flagPath: string): T => {
    return document.value.getFlag(SYSTEM_ID, flagPath) as T;
  };

  const normalizeMaskValue = <T,>(fieldPath: string, maskValue: unknown): T => {
    const schemaField = getSchemaField(document.value, fieldPath);
    if (!(schemaField instanceof EmbeddedDataField) || !maskValue || typeof maskValue !== 'object') {
      return maskValue as T;
    }

    const currentValue = foundry.utils.getProperty(document.value, fieldPath) as { constructor?: Function } | undefined;
    const rawCtor = currentValue?.constructor;
    if (!rawCtor || rawCtor === Object) {
      return maskValue as T;
    }
    const CurrentCtor = rawCtor as new (data: unknown) => T;

    try {
      return new CurrentCtor(maskValue);
    } catch {
      return maskValue as T;
    }
  };

  const isFieldMaskable = (fieldPath: string): boolean => {
    const schemaField = getSchemaField(document.value, fieldPath) as { options?: { maskable?: boolean }; persisted?: boolean } | undefined;
    if (!schemaField) return true;
    if (schemaField.options?.maskable !== undefined) return schemaField.options.maskable;
    if (schemaField.persisted === false) return false;
    return true;
  };

  const getFieldMaskedEditStrategy = (fieldPath: string): MaskedEditStrategy => {
    const schemaField = getSchemaField(document.value, fieldPath) as { options?: { maskedEditStrategy?: MaskedEditStrategy } } | undefined;
    return schemaField?.options?.maskedEditStrategy ?? MASKED_EDIT_STRATEGY.PLAYER_SECRET_ROUTE;
  };

  const documentMasks = computed((): Record<string, unknown> | undefined => {
    const directMasks = (document.value as unknown as { _masks?: Record<string, unknown> })._masks;
    if (directMasks) return directMasks;

    if (document.value.documentName !== 'Actor') return undefined;

    const effects = (document.value as unknown as { effects?: Iterable<ActiveEffectDnd35e> }).effects;
    return buildMaskMapFromSecretEffects(
      effects,
      EFFECT_CHANGE_TARGET.ACTOR,
      (effect, change) => resolveMaskedActiveEffectChangeValue(effect, change)
    );
  });

  const getViewAwareFieldValue = <T,>(fieldPath: string, getFromSource = false): T => {
    const plan = resolveViewAwareFieldPlan(
      {
        isEditMode: isEditMode.value,
        isPlayMode: isPlayMode.value,
        isTrueMode: isTrueMode.value,
        isGM: isGM.value,
      },
      getFromSource
    );

    // Apply masks in Play Mode, and also in player Edit Mode so non-GM owners
    // do not see GM truth while editing masked fields.
    if (plan.checkMasks && isFieldMaskable(fieldPath)) {
      const masks = documentMasks.value;
      if (masks && fieldPath in masks) {
        return normalizeMaskValue<T>(fieldPath, masks[fieldPath]);
      }
    }

    // True Mode: some top-level document getters can project mask values, so reading the derived property would
    // return the masked value even though checkMasks is false. Guard: if the field
    // has a mask entry, read from _source to get the real (unmasked) value.
    if (isTrueMode.value && isFieldMaskable(fieldPath)) {
      const masks = documentMasks.value;
      if (masks && fieldPath in masks) {
        return foundry.utils.getProperty(document.value, `_source.${fieldPath}`) as T;
      }
    }

    // persisted:false fields (computed/derived values) have no _source entry.
    // They are always read from live derived data regardless of view mode —
    // there is no "source" version of a derived value to show.
    const schemaField = getSchemaField(document.value, fieldPath);
    // `persisted` is a direct instance property on Foundry's DataField at runtime
    // but is not yet reflected in the TypeScript stubs.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isDerived = (schemaField as any)?.persisted === false;

    const useSource = !isDerived && plan.readMode === 'source';
    const usableFieldPath = useSource ? `_source.${fieldPath}` : `${fieldPath}`;
    const viewValue = foundry.utils.getProperty(document.value, usableFieldPath) as T | undefined;

    // Some top-level document getters (notably img) can be undefined in non-source
    // paths for certain sheet/view states. Fallback keeps display stable.
    if (!useSource && viewValue === undefined) {
      return foundry.utils.getProperty(document.value, `_source.${fieldPath}`) as T;
    }

    return viewValue as T;
  };

  const getIsFieldVisible = (
    fieldPath: string,
    defaultVisibility?: FieldVisibility
  ): ComputedRef<boolean> =>
    computed(() => {
      const currentVisibility = isGM.value
        ? gmOnlyVisibility
        : isOwnerOrGM.value
          ? ownerPlusVisibility
          : everyoneVisibility;

      return fieldOverridesUtils.getIsVisible(
        fieldPath,
        currentVisibility,
        defaultVisibility
      );
    });

  const getIsFieldEditable = (
    fieldPath: string,
    defaultEditability?: FieldEditability,
    allowForceEdit = false
  ): ComputedRef<boolean> =>
    computed(() => {
      if (!isEditMode.value && !allowForceEdit) return false;
      const currentEditability = isGM.value ? gmOnlyEditability : normalEditability;
      return fieldOverridesUtils.getIsEditable(
        fieldPath,
        currentEditability,
        defaultEditability
      );
    });

  const hasMaskForField = (fieldPath: string): ComputedRef<boolean> =>
    computed(() => {
      const masks = documentMasks.value;
      return !!masks && fieldPath in masks;
    });

  const getMaskForField = <T = unknown,>(fieldPath: string): ComputedRef<T | undefined> =>
    computed(() => {
      const masks = documentMasks.value;
      if (!masks || !(fieldPath in masks)) return undefined;
      return normalizeMaskValue<T>(fieldPath, masks[fieldPath]);
    });

  const documentGetters: DocumentSheetStoreDocumentGetters = {
    // Data access
    getIsFieldEditable,
    getIsFieldVisible,
    getViewAwareFieldValue,
    hasMaskForField,
    getMaskForField,

    // Document identity
    type: computed(() => document.value.type),
    documentName: computed(() => document.value.documentName),
    localizedType: computed(() => game.i18n.localize(document.value.localizedType)),
    systemSlug: computed(() => document.value.system.slug || ''),
    documentUuid: computed(() => document.value.uuid || ''),
    documentId: computed(() => document.value.id || ''),

    // Parent information (for embedded documents)
    parentUuid: computed(() => document.value.parent?.uuid || null),

    // View-aware document fields
    name: computed(() => getViewAwareFieldValue('name') || ''),
    nameFormula: computed(() => getViewAwareFieldValue('system.nameFormula') || ''),
    img: computed(() => getViewAwareFieldValue('img') || ''),
    description: computed(() => getViewAwareFieldValue('system.description') || ''),
    preparationWarnings: computed(() => [...(document.value._preparationWarnings ?? [])]),

    // Field overrides (delegated to FieldOverridesStore)
    ...fieldOverridesGetters,

    // Active effects (defaults — overridden by extending stores)
    getEffectsForField: (_fieldPath: string) => computed(() => []),
    hasEffectsForField: (_fieldPath: string) => computed(() => false),

    // Utilities
    familiarSchema: computed(() => buildDocumentFamiliar(document.value as any)),
  };

  // --- Actions ---

  const documentActions: DocumentSheetStoreDocumentActions<TDocument> = {
    // updateDocument,
    viewModeAwareUpdateDocument,
    getViewAwareFieldUpdater: (
      path: string,
      options: Partial<DatabaseUpdateOperation<TDocument>> = {}
    ): ((value: unknown) => Promise<boolean>) => {
      return async (value: unknown) => viewModeAwareUpdateDocument({ [path]: value }, options);
    },
    updateFlag,
    ...fieldOverridesActions,
  };

  // --- Store utilities (for extending stores) ---
  const _storeUtils: DocumentSheetStoreUtils<TDocument> = {
    ...fieldOverridesUtils,
    document: document as ShallowRef<TDocument>,
    updateDocument,
    updateFlag,
    tabStore,
    renderModeStore,
    getProperty: <T,>(path: string) => computed(() => foundry.utils.getProperty(document.value, path) as T),
    getSourceProperty: <T,>(path: string) => computed(() => {
      const raw = foundry.utils.getProperty(document.value._source, path);
      // Clone objects so Vue's computed cache detects in-place mutations from Foundry's mergeObject
      return (typeof raw === 'object' && raw !== null ? foundry.utils.deepClone(raw) : raw) as T;
    }),
    getFlagValue,

    setGetFreshDocument: (fn: (id: string) => Promise<TDocument | null>) => {
      _getFreshDocumentImpl.value = fn;
    },
    refreshDocument: async (doc?: TDocument | null) => {
      if (!doc) {
        doc = await _getFreshDocumentImpl.value(document.value.uuid);
      }
      document.value = doc ?? null;
      triggerRef(document);
    },
    refreshContext: async (context: Partial<VueApplicationContext<TDocument>> | undefined) => {
      document.value = context?.document
        ?? await _getFreshDocumentImpl.value(document.value.uuid)
        ?? document.value;
      triggerRef(document);
      state.renderOptions = context?.renderOptions ?? state.renderOptions;
    },

    enrichHTML: async (content: string) => {
      if (!content) return '';
      try {
        return await foundry.applications.ux.TextEditor.enrichHTML(content, {
          secrets: document.value.isOwner,
          rollData: {},
          relativeTo: document.value,
        });
      } catch {
        return content;
      }
    },
    createLocalizedComputed: (text: string) => computed(() => game.i18n.localize(text)),
  };

  return {
    isFirstRender: computed(() => state.renderOptions?.isFirstRender),
    _storeUtils,
    documentGetters,
    documentActions,
    isGM,
    isOwnerOrGM,
  };
};

const DocumentSheetStoreSymbol = Symbol('DocumentSheetStore');

export {
  DocumentSheetStoreSymbol,
  useDocumentSheetStore,
};

export type {
  DocumentSheetStore,
  DocumentSheetStoreDocumentActions,
  DocumentSheetStoreDocumentGetters,
  DocumentSheetStoreUtils,
  EvaluationDocument,
  FormulaRegistration,
  SheetDocument,
  SheetTab,
};
