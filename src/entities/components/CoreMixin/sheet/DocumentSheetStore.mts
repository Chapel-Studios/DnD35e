import type { ActorType } from '@actors/actorTypes.mjs';
import type { DatabaseUpdateOperation } from '@common/abstract/_types.mjs';
import type { DnD35eActiveEffect, EffectType } from '@effects/index.mjs';
import { addOrUpdatePlayerEditMask, findOrCreatePlayerEditSecret } from '@effects/secret/playerEditSecret.mjs';
import { buildDocumentFamiliar } from '@helpers/formulae/index.mjs';
import type { FamiliarSchema } from '@helpers/formulae/types.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/itemTypes.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import type {
  FieldEditability,
  FieldVisibility,
} from '@vc/Fields/FormGroups/fieldPermissions.mjs';
import {
  everyoneVisibility,
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
  updateDocument: (data: Record<string, unknown>, options?: Partial<DatabaseUpdateOperation<TDocument>>) => Promise<boolean>;
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
  } = {}
): DocumentSheetStore<TDocument> => {

  // --- Core state ---
  const document = shallowRef(context.document);
  const state = reactive({
    ...createBaseState(),
    renderOptions: unref(context.renderOptions),
  });

  const {
    isPlayMode,
    isEditMode,
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
    data: Record<string, unknown>,
    options: Partial<DatabaseUpdateOperation<TDocument>> = {},
    directUpdate: boolean = false
  ) => {
    if (directUpdate) return await updateDocument(data, options);

    // Player Edit Secret interception: non-GM writing to a masked field on an Item
    if (!isGM.value && document.value.documentName === 'Item') {
      const masks = (document.value as unknown as { _masks?: Record<string, unknown> })._masks;
      if (masks) {
        const maskedFields: Record<string, unknown> = {};
        const normalFields: Record<string, unknown> = {};
        for (const [field, value] of Object.entries(data)) {
          if (field in masks) {
            maskedFields[field] = value;
          } else {
            normalFields[field] = value;
          }
        }
        if (Object.keys(maskedFields).length > 0) {
          const item = document.value as unknown as ItemDnd35e;
          const secret = await findOrCreatePlayerEditSecret(item);
          for (const [fieldPath, value] of Object.entries(maskedFields)) {
            await addOrUpdatePlayerEditMask(secret, fieldPath, value);
          }
          // If there are also non-masked fields, update those normally
          if (Object.keys(normalFields).length > 0) {
            return await updateDocument(normalFields as Record<string, unknown>, options);
          }
          return true;
        }
      }
    }

    return await updateDocument(data, options);
  };

  // --- Overridable implementations (replaced by extending stores via _storeUtils) ---

  const _getFreshDocumentImpl = ref<(id: string) => Promise<TDocument | null>>(
    async (_id: string): Promise<TDocument | null> => {
      console.error('getFreshDocument is not implemented for this store');
      return null;
    }
  );

  // --- Getters ---

  const getFlagValue = <T,>(flagPath: string): T => {
    return document.value.getFlag(SYSTEM_ID, flagPath) as T;
  };

  const getSchemaField = (fieldPath: string): foundry.data.fields.DataField | undefined => {
    if (!fieldPath.startsWith('system.')) return undefined;
    const systemPath = fieldPath.replace(/^system\./, '');
    const systemModel = document.value.system as foundry.abstract.DataModel | undefined;
    const schema = ((systemModel?.constructor as {
      schema?: { _getField?: (path: string[]) => foundry.data.fields.DataField | undefined };
    } | undefined)?.schema) ?? systemModel?.schema;
    return schema?._getField?.(systemPath.split('.'));
  };

  const normalizeMaskValue = <T,>(fieldPath: string, maskValue: unknown): T => {
    const schemaField = getSchemaField(fieldPath);
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

  const getViewAwareFieldValue = <T,>(fieldPath: string, getFromSource = false): T => {
    if (isEditMode.value && isGM.value) {
      // GMs edit the real/source data directly. Players in edit mode should still
      // see masked values so their edits route through Player Edit Secrets.
      getFromSource = true;
    }

    // Apply masks in Play Mode, and also in player Edit Mode so non-GM owners
    // do not see GM truth while editing masked fields.
    if (isPlayMode.value || (!isGM.value && isEditMode.value)) {
      const masks = (document.value as unknown as { _masks?: Record<string, unknown> })._masks;
      if (masks && fieldPath in masks) {
        return normalizeMaskValue<T>(fieldPath, masks[fieldPath]);
      }
    }

    const usableFieldPath = getFromSource ? `_source.${fieldPath}` : `${fieldPath}`;
    const viewValue = foundry.utils.getProperty(document.value, usableFieldPath) as T | undefined;

    // Some top-level document getters (notably img) can be undefined in non-source
    // paths for certain sheet/view states. Fallback keeps display stable.
    if (!getFromSource && viewValue === undefined) {
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
    defaultEditability?: FieldEditability
  ): ComputedRef<boolean> =>
    computed(() => {
      if (!isEditMode.value) return false;
      const currentEditability = isGM.value ? gmOnlyEditability : normalEditability;
      return fieldOverridesUtils.getIsEditable(
        fieldPath,
        currentEditability,
        defaultEditability
      );
    });

  const hasMaskForField = (fieldPath: string): ComputedRef<boolean> =>
    computed(() => {
      const masks = (document.value as unknown as { _masks?: Record<string, unknown> })._masks;
      return !!masks && fieldPath in masks;
    });

  const getMaskForField = <T = unknown,>(fieldPath: string): ComputedRef<T | undefined> =>
    computed(() => {
      const masks = (document.value as unknown as { _masks?: Record<string, unknown> })._masks;
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
      // Clone objects so Vue's computed cache detects in-place mutations from Foundry's mergeObject
      return (typeof raw === 'object' && raw !== null ? foundry.utils.deepClone(raw) : raw) as T;
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
