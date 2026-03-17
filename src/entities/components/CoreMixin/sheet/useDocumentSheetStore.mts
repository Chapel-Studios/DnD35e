import { ActorType } from '@actors/actorTypes.mjs';
import type { DatabaseUpdateOperation } from '@common/abstract/_types.mjs';
import type { DnD35eActiveEffect } from '@effects/index.mjs';
import {
  ContextDocumentType,
  DocumentContext,
  getIntellisenseBuilder,
  hasIntellisenseSchema,
  IntellisenseContext,
  IntellisenseSchema,
  NonNullDocumentContext,
} from '@helpers/formulae/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import { ItemType } from '@items/itemTypes.mjs';
import type {
  FieldOverride,
  FieldOverrides,
} from '@vc/Fields/FormGroups/fieldPermissions.mjs';
import { encodeFieldPath, FIELD_OVERRIDES_FLAG } from '@vc/Fields/FormGroups/fieldPermissions.mjs';
import type { VueApplicationContext } from '@vueApps/index.mjs';
import type { Component, ComputedRef, ShallowRef } from 'vue';
import { computed, reactive, ref, shallowRef, triggerRef, unref } from 'vue';

/**
 * Base document type that both Items and ActiveEffects share
 */
type SheetDocument = ItemDnd35e | DnD35eActiveEffect;

interface SheetTab {
  id: string;
  label: string;
  component: Component;
  order: number;
  icon?: string;
  tooltip?: string;
}

interface BaseSheetState {
  tabs: SheetTab[];
  activeTab: string;
  isEditable: boolean;
  renderOptions: { isFirstRender?: boolean } | undefined;
}

const createBaseState = (defaultTabs: SheetTab[] = [], defaultActiveTab: string = ''): BaseSheetState => ({
  tabs: defaultTabs,
  activeTab: defaultActiveTab || defaultTabs[0]?.id || '',
  isEditable: false,
  renderOptions: undefined,
});

type FormulaRegistration = {
  impactedField: string;
  formulaField: string;
  evaluate: (document: NonNullDocumentContext) => unknown;
}
type FormulaContextBuilder = (document: NonNullDocumentContext) => Record<string, DocumentContext> | null;

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
  // Core state
  // Use shallowRef to avoid Vue's deep reactivity wrapping Foundry's document proxy,
  // which would conflict with EmbeddedCollection's non-configurable properties (e.g., effects)
  const document = shallowRef(context.document);
  const state = reactive({
    ...createBaseState(options.defaultTabs, options.defaultActiveTab),
    isEditable: context.isEditable,
    renderOptions: unref(context.renderOptions),
  });

  // Tabs
  const tabGetters: DocumentSheetStoreTabGetters = {
    activeTabId: computed(() => state.activeTab),
    tabs: computed(() => (state.tabs ?? []).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    )),
    getIsTabOpen: (tabId: string) => computed(() => state.activeTab === tabId),
  };

  const tabActions: DocumentSheetStoreTabActions = {
    activateTab: (tabId: string) => {
      state.activeTab = tabId;
    },
    replaceTabs: (newTabs: SheetTab[], resetActiveTab: boolean = true) => {
      state.tabs = [...newTabs];
      if (resetActiveTab) {
        state.activeTab = newTabs[0]?.id || '';
      }
    },
    appendTabs: (newTabs: SheetTab[]) => {
      state.tabs = [...state.tabs, ...newTabs];
    },
  };

  // Document getters - common to all document sheets
  const fieldOverrides = computed((): FieldOverrides => {
    return (document.value.getFlag('dnd35e', FIELD_OVERRIDES_FLAG) as FieldOverrides | undefined) ?? {};
  });

  // Overridable implementations - these can be replaced by extending stores via _storeUtils
  type GetEffectiveFieldValueFn = <T>(fieldPath: string, realValue: T) => T;
  type GetViewAwareFieldUpdaterFn = (path: string) => (value: unknown) => Promise<boolean>;
  type EditorViewModeGetter = () => 'identified' | 'unidentified';

  const _getEffectiveFieldValueImpl = ref<GetEffectiveFieldValueFn>(
    <T,>(_fieldPath: string, realValue: T): T => realValue
  );
  const _getViewAwareFieldUpdaterImpl = ref<GetViewAwareFieldUpdaterFn>(
    (path: string) => async (value: unknown) => {
      return await updateDocument({ [path]: value } as Partial<TDocument>);
    }
  );
  const _editorViewModeImpl = ref<EditorViewModeGetter>(() => 'identified');

  /**
   * Get the effective value for a field.
   * Default implementation just returns the real value.
   * Can be overridden via _storeUtils.setGetEffectiveFieldValue().
   */
  const getEffectiveFieldValue = <T,> (fieldPath: string, realValue: T): T => {
    return _getEffectiveFieldValueImpl.value(fieldPath, realValue);
  };

  const documentGetters: DocumentSheetStoreDocumentGetters = {
    getEffectiveFieldValue,
    getProperty: <T,>(path: string) => computed(() => foundry.utils.getProperty(document.value, path) as T),
    type: computed(() => document.value.type),
    localizedType: computed(() => game.i18n.localize(document.value.localizedType)),

    name: computed(() => getEffectiveFieldValue('name', document.value.name) || ''),
    displayName: computed(() => getEffectiveFieldValue('displayName', document.value.name) || ''),
    nameFormula: computed(() => getEffectiveFieldValue('nameFormula', document.value.system.nameFormula?.formula) || ''),

    img: computed(() => getEffectiveFieldValue('img', document.value.img) || ''),

    systemUniqueId: computed(() => document.value.system.uniqueId || ''),
    documentUuid: computed(() => document.value.uuid || ''),

    description: computed(() => getEffectiveFieldValue('description', document.value.system.description.value) || ''),

    // Field permission overrides
    fieldOverrides,
    getFieldOverride: (fieldPath: string): FieldOverride | undefined => {
      const encodedPath = encodeFieldPath(fieldPath);
      return fieldOverrides.value[encodedPath];
    },
  };

  const buildIntellisenseContext = <TSubType extends ContextDocumentType = ContextDocumentType> (doc: DocumentContext, aliases: string[] = []): IntellisenseContext => {
    const result = { properties: {}, aliases } satisfies IntellisenseContext;
    if (!doc) return result;

    const documentType = doc.documentName;
    const subtype = doc.type as TSubType;
    result.properties = hasIntellisenseSchema(documentType, subtype)
      ? getIntellisenseBuilder(documentType, subtype)!(doc)
      : {};
    
    return result;
  };
  const getSelf = (aliases: string[] = []) => computed((): IntellisenseContext => {
    return buildIntellisenseContext(document.value, aliases);
  });
  const getParent = (
    aliases: string[] = [],
    fallback?: { documentType: foundry.CONST.DocumentType; subtype: ContextDocumentType }
  ) => computed((): IntellisenseContext => {
    const doc = context.document?.parent;
    if (doc) return buildIntellisenseContext<ActorType | ItemType>(doc, aliases);

    // No parent — build a shell context from the fallback type (static schema, no live values)
    if (fallback && hasIntellisenseSchema(fallback.documentType, fallback.subtype)) {
      return {
        properties: getIntellisenseBuilder(fallback.documentType, fallback.subtype)!(),
        aliases,
      };
    }
    return { properties: {}, aliases };
  });
  const intellisense = {
    getSelf,
    getParent, // set as default so both item and effect get it, must be manually removed in actorStore
    nameFormulaIntellisenseSchema: computed((): IntellisenseSchema => {
      const selfContext = getSelf().value;
      return {
        self: selfContext,
      };
    }),
  };
  const localize = (text: string) => computed(() => game.i18n.localize(text));

  // Document actions
  const updateDocument =  async (
    data: Partial<TDocument>,
    options: Partial<DatabaseUpdateOperation<TDocument>> = {}
  ) => {
    const updatedDoc = await document.value.update(data, options) as TDocument;
    if (updatedDoc) {
      document.value = updatedDoc;
      // Since the object was mutated Vue refuses to see any changes;
      // TODO: write something smarter so we only have to refresh the parts of store that changed
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

  const documentActions = {
    updateDocument,
    /**
     * Get a direct field updater that always writes to the real field.
     * Use this for state fields (isCarried, isBroken, etc.) and meta fields (isIdentifiable).
     */
    getDirectFieldUpdater: (path: string) => {
      return async (value: unknown) => {
        return await updateDocument({ [path]: value } as Partial<TDocument>);
      };
    },
    /**
     * Get a field updater that is view-mode aware.
     * Default implementation just writes to the real field.
     * Can be overridden via _storeUtils.setGetViewAwareFieldUpdater().
     */
    getViewAwareFieldUpdater: (path: string) => {
      return _getViewAwareFieldUpdaterImpl.value(path);
    },
    updateFlag,
    setFieldOverride: async (fieldPath: string, override: FieldOverride | null): Promise<boolean> => {
      const encodedPath = encodeFieldPath(fieldPath);
      const current = { ...fieldOverrides.value };
      if (override === null) {
        delete current[encodedPath];
      } else {
        current[encodedPath] = override;
      }
      return await updateFlag(FIELD_OVERRIDES_FLAG, current);
    },
  };

  // Edit mode - uses shared sheetState from context
  const isEditMode = computed(() => context.sheetState.editMode);

  const modeActions = {
    toggleEditMode: () => {
      context.sheetState.editMode = !context.sheetState.editMode;
    },
    setEditMode: (enabled: boolean) => {
      context.sheetState.editMode = enabled;
    },
  };

  // Field permissions
  const isGM = computed(() => game.user.isGM);
  const isOwnerOrGM = computed(() => {
    if (game.user.isGM) return true;
    return document.value.testUserPermission(game.user, 'OWNER');
  });

  // Internal utilities for extending stores
  const _storeUtils: DocumentSheetStoreUtils<TDocument> = {
    /** The reactive document reference. Use for extending stores only. */
    document: document as ShallowRef<TDocument>,
    /** Update the document and trigger reactivity. */
    updateDocument,
    /** Update a flag on the document. */
    updateFlag,
    /** Manually trigger Vue reactivity on the document ref. */
    refreshDocument: () => triggerRef(document),
    /** Override the getEffectiveFieldValue implementation. */
    setGetEffectiveFieldValue: (fn: <T>(fieldPath: string, realValue: T) => T) => {
      _getEffectiveFieldValueImpl.value = fn;
    },
    /** Override the getViewAwareFieldUpdater implementation. */
    setGetViewAwareFieldUpdater: (fn: (path: string) => (value: unknown) => Promise<boolean>) => {
      _getViewAwareFieldUpdaterImpl.value = fn;
    },
    /** Override the editorViewMode getter. */
    setEditorViewMode: (fn: () => 'identified' | 'unidentified') => {
      _editorViewModeImpl.value = fn;
    },
  };

  // Editor view mode - top level, can be overridden via _storeUtils.setEditorViewMode()
  const editorViewMode = computed(() => _editorViewModeImpl.value());

  return {
    isEditable: computed(() => state.isEditable && isEditMode.value),
    isEditMode,
    isFirstRender: computed(() => state.renderOptions?.isFirstRender),
    editorViewMode,
    tabs: {
      tabGetters,
      tabActions,
    },
    modeActions,
    _storeUtils,
    documentGetters,
    documentActions,
    intellisense,
    localize,
    // Field permissions
    isGM,
    isOwnerOrGM,
  };
};

type DocumentSheetStoreTabGetters = {
  activeTabId: ComputedRef<string>;
  tabs: ComputedRef<(SheetTab & { order: number })[]>;
  getIsTabOpen: (tabId: string) => ComputedRef<boolean>;
};

type DocumentSheetStoreTabActions = {
  activateTab: (tabId: string) => void;
  replaceTabs: (newTabs: SheetTab[]) => void;
  appendTabs: (newTabs: SheetTab[]) => void;
};

type DocumentSheetStoreTabs = {
  tabActions: DocumentSheetStoreTabActions;
  tabGetters: DocumentSheetStoreTabGetters;
}

type DocumentSheetStoreUtils<TDocument extends SheetDocument> = {
  document: ShallowRef<TDocument>;
  updateDocument: (data: Partial<TDocument>, options?: Partial<DatabaseUpdateOperation<TDocument>>) => Promise<boolean>;
  updateFlag: (key: string, value: unknown) => Promise<boolean>;
  refreshDocument: () => void;
  setGetEffectiveFieldValue: (fn: <T>(fieldPath: string, realValue: T) => T) => void;
  setGetViewAwareFieldUpdater: (fn: (path: string) => (value: unknown) => Promise<boolean>) => void;
  setEditorViewMode: (fn: () => 'identified' | 'unidentified') => void;
};

type DocumentSheetStoreDocumentGetters = {
  getProperty: <T>(path: string) => ComputedRef<T>;
  type: ComputedRef<string>;
  localizedType: ComputedRef<string>;
  name: ComputedRef<string>;
  displayName: ComputedRef<string>;
  nameFormula: ComputedRef<string>;
  img: ComputedRef<string>;
  systemUniqueId: ComputedRef<string>;
  documentUuid: ComputedRef<string>;
  description: ComputedRef<string>;
  // Field permission overrides
  fieldOverrides: ComputedRef<FieldOverrides>;
  getFieldOverride: (fieldPath: string) => FieldOverride | undefined;
  // View-aware field access (default: returns real value)
  getEffectiveFieldValue: <T>(fieldPath: string, realValue: T) => T;
};

type DocumentSheetStoreDocumentActions<TDocument extends SheetDocument> = {
  updateDocument: (data: Partial<TDocument>, options?: Partial<DatabaseUpdateOperation<TDocument>>) => Promise<boolean>;
  getDirectFieldUpdater: (path: string) => (value: unknown) => Promise<boolean>;
  getViewAwareFieldUpdater: (path: string) => (value: unknown) => Promise<boolean>;
  updateFlag: (key: string, value: unknown) => Promise<boolean>;
  setFieldOverride: (fieldPath: string, override: FieldOverride | null) => Promise<boolean>;
};

type DocumentSheetStore<TDocument extends SheetDocument = SheetDocument> = {
  isEditable: ComputedRef<boolean>;
  isEditMode: ComputedRef<boolean>;
  isFirstRender: ComputedRef<boolean | undefined>;
  editorViewMode: ComputedRef<'identified' | 'unidentified'>;
  tabs: DocumentSheetStoreTabs;
  modeActions: {
    toggleEditMode: () => void;
    setEditMode: (enabled: boolean) => void;
  };
  _storeUtils: DocumentSheetStoreUtils<TDocument>;
  documentGetters: DocumentSheetStoreDocumentGetters;
  intellisense: {
    getSelf: (aliases?: string[]) => ComputedRef<IntellisenseContext>;
    getParent: (aliases?: string[], fallback?: { documentType: foundry.CONST.DocumentType; subtype: ContextDocumentType }) => ComputedRef<IntellisenseContext>;
    nameFormulaIntellisenseSchema: ComputedRef<IntellisenseSchema>;
  };
  documentActions: DocumentSheetStoreDocumentActions<TDocument>;
  localize: (text: string) => ComputedRef<string>;
  // Field permissions
  isGM: ComputedRef<boolean>;
  isOwnerOrGM: ComputedRef<boolean>;
};

export {
  useDocumentSheetStore,
};

export type {
  DocumentSheetStore,
  DocumentSheetStoreDocumentActions,
  DocumentSheetStoreDocumentGetters,
  DocumentSheetStoreUtils,
  FormulaContextBuilder,
  FormulaRegistration,
  SheetDocument,
  SheetTab,
};
