import type { ActorType } from '@actors/actorTypes.mjs';
import type { DatabaseUpdateOperation } from '@common/abstract/_types.mjs';
import type { DnD35eActiveEffect, EffectType } from '@effects/index.mjs';
import { Dnd35eField, type Dnd35eFieldData } from '@helpers/fields/Dnd35eField.mjs';
import { buildDocumentFamiliar } from '@helpers/formulae/index.mjs';
import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/itemTypes.mjs';
import {
  everyoneVisibility,
  FieldEditability,
  FieldVisibility,
  gmOnlyEditability,
  gmOnlyVisibility,
  normalEditability,
  ownerPlusVisibility,
} from '@vc/Fields/FormGroups/fieldPermissions.mjs';
import type { VueApplicationContext } from '@vueApps/index.mjs';
import type { ComputedRef, ShallowRef } from 'vue';
import { computed, inject, provide, reactive, ref, shallowRef, triggerRef, unref } from 'vue';

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SheetDocument = ItemDnd35e | DnD35eActiveEffect;

type DocumentSheetStoreUtils<TDocument extends SheetDocument> = FieldOverridesStoreUtils & {
  document: ShallowRef<TDocument>;
  updateDocument: (data: Partial<TDocument>, options?: Partial<DatabaseUpdateOperation<TDocument>>) => Promise<boolean>;
  updateFlag: (key: string, value: unknown) => Promise<boolean>;
  getProperty: <T>(path: string) => ComputedRef<T>;
  getSourceProperty: <T>(path: string) => ComputedRef<T>;
  getFlagValue: <T>(flagPath: string) => T;

  setGetFreshDocument: (fn: (id: string) => Promise<TDocument | null>) => void;
  refreshDocument: (doc?: TDocument | null) => Promise<void>;
  refreshContext: (context: VueApplicationContext<TDocument> | undefined) => void;

  enrichHTML: (content: string) => Promise<string>;
  createLocalizedComputed: (text: string) => ComputedRef<string>;
  tabStore: TabStore;
};

type DocumentSheetStoreDocumentGetters = FieldOverridesStoreGetters & {
  // Getter Functions
  getIsFieldVisible: (fieldPath: string, defaultVisibility?: FieldVisibility) => ComputedRef<boolean>;
  getIsFieldEditable: (fieldPath: string, defaultEditability?: FieldEditability) => ComputedRef<boolean>;
  getViewAwareFieldValue: <T>(fieldPath: string, getFromSource?: boolean) => T;

  type: ComputedRef<ItemType | ActorType | EffectType>;
  documentName: ComputedRef<foundry.CONST.DocumentType>;
  localizedType: ComputedRef<string>;
  name: ComputedRef<string>;
  nameFormula: ComputedRef<string>;
  img: ComputedRef<string>;
  systemUniqueId: ComputedRef<string>;
  documentUuid: ComputedRef<string>;
  description: ComputedRef<string>;
  getEffectsForField: (fieldPath: string) => ComputedRef<object[]>;
  hasEffectsForField: (fieldPath: string) => ComputedRef<boolean>;
  familiarSchema: ComputedRef<FamiliarSchema>;
};

type DocumentSheetStoreDocumentActions<TDocument extends SheetDocument> = FieldOverridesStoreActions & {
  // updateDocument: (data: Record<string, unknown>, options?: Partial<DatabaseUpdateOperation<TDocument>>) => Promise<boolean>;
  viewModeAwareUpdateDocument: (data: Record<string, unknown>, options?: Partial<DatabaseUpdateOperation<TDocument>>, directUpdate?: boolean) => Promise<boolean>;
  getDirectFieldUpdater: (path: string, options?: Partial<DatabaseUpdateOperation<TDocument>>) => (value: unknown) => Promise<boolean>;
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

/**
 * Check if a raw value looks like Dnd35eField compound data: `{ value, unidentifiedValue, … }`.
 * Used to transparently unwrap compound fields when reading source data
 * and to adjust update paths so writes target the inner `.value` sub-field.
 */
function isDnd35eFieldShape(val: unknown): val is { value: unknown } {
  return val !== null && typeof val === 'object' && 'value' in val && 'unidentifiedValue' in val;
}

interface BaseSheetState {
  isEditable: boolean;
  renderOptions: { isFirstRender?: boolean } | undefined;
}

const createBaseState = (): BaseSheetState => ({
  isEditable: false,
  renderOptions: undefined,
});

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
  } = {}
): DocumentSheetStore<TDocument> => {

  // --- Core state ---
  const document = shallowRef(context.document);
  const state = reactive({
    ...createBaseState(),
    renderOptions: unref(context.renderOptions),
  });

  const {
    isIdentifiedViewMode,
    identifiedViewMode,
    isEditViewMode,
    isOwnerOrGM,
    isGM,
  } = inject(RenderModeStoreSymbol) as RenderModeStore;

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
      await document.value.setFlag('dnd35e', key, value);
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
    data: Record<string, unknown>,
    options: Partial<DatabaseUpdateOperation<TDocument>> = {},
    directUpdate: boolean = false
  ) => {
    if (directUpdate) return await updateDocument(data, options);
    const valueTarget = isIdentifiedViewMode.value
      ? 'value'
      : 'unidentifiedValue';

    const updateData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => {
        // Check if this path points to a Dnd35eField compound shape in the source data
        const raw = foundry.utils.getProperty(document.value._source, key);
        if (isDnd35eFieldShape(raw)) {
          // Path points at a compound — append the correct sub-field
          return [`${key}.${valueTarget}`, value];
        }

        // Check if path already targets a compound sub-field (.value or .unidentifiedValue)
        // e.g. "system.hardness.value" where "system.hardness" is a compound
        if (key.endsWith('.value') || key.endsWith('.unidentifiedValue')) {
          const suffix = key.endsWith('.value') ? '.value' : '.unidentifiedValue';
          const basePath = key.slice(0, -suffix.length);
          const parentRaw = foundry.utils.getProperty(document.value._source, basePath);
          if (isDnd35eFieldShape(parentRaw)) {
            // Re-route to the correct sub-field based on view mode
            return [`${basePath}.${valueTarget}`, value];
          }
        }

        // Check if the path passes THROUGH a compound at an intermediate segment
        // e.g. "system.nameFormula.formula" where "system.nameFormula" is { value, unidentifiedValue }
        const segments = key.split('.');
        for (let i = segments.length - 1; i >= 1; i--) {
          const ancestorPath = segments.slice(0, i).join('.');
          const ancestorRaw = foundry.utils.getProperty(document.value._source, ancestorPath);
          if (isDnd35eFieldShape(ancestorRaw)) {
            const remainder = segments.slice(i).join('.');
            return [`${ancestorPath}.${valueTarget}.${remainder}`, value];
          }
        }

        // Non-compound field — leave path as-is
        return [key, value];
      })
    ) as Record<string, unknown>;
    return await updateDocument(updateData, options);
  };

  // --- Overridable implementations (replaced by extending stores via _storeUtils) ---

  // type GetEffectiveFieldValueFn = <T>(fieldPath: string, realValue: T) => T;
  // type GetViewAwareFieldUpdaterFn = (path: string) => (value: unknown) => Promise<boolean>;

  // const _getEffectiveFieldValueImpl = ref<GetEffectiveFieldValueFn>(
  //   <T,>(_fieldPath: string, realValue: T): T => realValue
  // );
  // const _getViewAwareFieldUpdaterImpl = ref<GetViewAwareFieldUpdaterFn>(
  //   (path: string) => async (value: unknown) => {
  //     return await updateDocument({ [path]: value } as Partial<TDocument>);
  //   }
  // );
  const _getFreshDocumentImpl = ref<(id: string) => Promise<TDocument | null>>(
    async (_id: string): Promise<TDocument | null> => {
      console.error('getFreshDocument is not implemented for this store');
      return null;
    }
  );

  // --- Getters ---
  // const viewModeAwareGetEffectiveFieldValue = <T,>(fieldPath: string): T => {
  //   const raw = foundry.utils.getProperty(document.value._source, fieldPath);
  //   const isDnd35eField = isDnd35eFieldShape(raw);
  //   if (isDnd35eField) {
  //     const field = raw as unknown as Dnd35eField;
  //     return field.getViewModeAwareValue(identifiedViewMode.value) as T;
  //   }

  // }

  const getFlagValue = <T,>(flagPath: string): T => {
    return document.value.getFlag('dnd35e', flagPath) as T;
  };

  const getSchemaField = (fieldPath: string): Dnd35eField | undefined => {
    const systemPath = fieldPath.replace(/^system\./, '');
    const schema = (document.value.system as foundry.abstract.DataModel | undefined)?.schema;
    const field = schema?._getField(systemPath.split('.'));
    return field instanceof Dnd35eField ? field : undefined;
  };

  const getViewAwareFieldValue = <T,>(fieldPath: string, getFromSource = false): T => {
    if (isEditViewMode.value) {
      // In edit mode, always get from source to avoid Active Effect overrides
      getFromSource = true;
    }
    const usableFieldPath = getFromSource ? `_source.${fieldPath}` : `${fieldPath}`;
    const raw = foundry.utils.getProperty(document.value, usableFieldPath);
    if (isDnd35eFieldShape(raw)) {
      return Dnd35eField.getEffective(raw as Dnd35eFieldData, identifiedViewMode.value) as T;
    }
    return raw as T;
  };

  // const getViewAwareFieldValue = <T,> (fieldPath: string, realValue: T): T => {
  //   const raw = foundry.utils.getProperty(document.value._source, fieldPath);
  //   const actualPath = isDnd35eFieldShape(raw) ? `${fieldPath}.value` : fieldPath;
  //   return _getEffectiveFieldValueImpl.value(actualPath, realValue);
  // };

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
    defaultEditability?: FieldEditability
  ): ComputedRef<boolean> =>
    computed(() => {
      if (!isEditViewMode.value) return false;
      const currentEditability = isGM.value ? gmOnlyEditability : normalEditability;
      return fieldOverridesUtils.getIsEditable(
        fieldPath,
        currentEditability,
        defaultEditability
      );
    });

  const documentGetters: DocumentSheetStoreDocumentGetters = {
    // Data access
    getIsFieldEditable,
    getIsFieldVisible,
    getViewAwareFieldValue,

    // Document identity
    type: computed(() => document.value.type),
    documentName: computed(() => document.value.documentName),
    localizedType: computed(() => game.i18n.localize(document.value.localizedType)),
    systemUniqueId: computed(() => document.value.system.uniqueId || ''),
    documentUuid: computed(() => document.value.uuid || ''),

    // View-aware document fields
    name: computed(() => getViewAwareFieldValue('name') || ''),
    nameFormula: computed(() => getViewAwareFieldValue('system.nameFormula') || ''),
    img: computed(() => getViewAwareFieldValue('img') || ''),
    description: computed(() => getViewAwareFieldValue('system.description') || ''),

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
    getDirectFieldUpdater: (
      path: string,
      options: Partial<DatabaseUpdateOperation<TDocument>> = {}
    ): ((value: unknown) => Promise<boolean>) => {
      return async (value: unknown) => viewModeAwareUpdateDocument({ [path]: value }, options, true);
    },
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
    getProperty: <T,>(path: string) => computed(() => foundry.utils.getProperty(document.value, path) as T),
    getSourceProperty: <T,>(path: string) => computed(() => {
      const raw = foundry.utils.getProperty(document.value._source, path);
      const result = isDnd35eFieldShape(raw) ? raw.value : raw;
      // Clone objects so Vue's computed cache detects in-place mutations from Foundry's mergeObject
      return (typeof result === 'object' && result !== null ? foundry.utils.deepClone(result) : result) as T;
    }),
    getFlagValue,

    setGetFreshDocument: (fn: (id: string) => Promise<TDocument | null>) => {
      _getFreshDocumentImpl.value = fn;
    },
    refreshDocument: async (doc?: TDocument | null) => {
      if (!doc) {
        doc = await _getFreshDocumentImpl.value(document.value._id);
      }
      document.value = doc ?? null;
      triggerRef(document);
    },
    refreshContext: async (context: Partial<VueApplicationContext<TDocument>> | undefined) => {
      document.value = context?.document
        ?? await _getFreshDocumentImpl.value(document.value._id)
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
