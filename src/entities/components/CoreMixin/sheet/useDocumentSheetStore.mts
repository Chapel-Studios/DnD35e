import type { DatabaseUpdateOperation } from '@common/abstract/_types.mjs';
import type { DnD35eActiveEffect } from '@effects/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { VueApplicationContext } from '@vueApps/index.mjs';
import type { Component, ComputedRef, Ref } from 'vue';
import { computed, reactive, ref, triggerRef, unref } from 'vue';

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

/**
 * Creates the base document sheet store with shared functionality for tabs and document management.
 * This is used by both useItemSheetStore and useActiveEffectConfigStore.
 */
const useDocumentSheetStore = <TDocument extends SheetDocument>(
  context: VueApplicationContext<TDocument>,
  options: {
    defaultTabs?: SheetTab[];
    defaultActiveTab?: string;
  } = {},
): DocumentSheetStore<TDocument> => {
  // Core state
  const document = ref(context.document);
  const state = reactive({
    ...createBaseState(options.defaultTabs, options.defaultActiveTab),
    isEditable: context.isEditable,
    renderOptions: unref(context.renderOptions),
  });

  // Tabs
  const tabGetters = {
    activeTabId: computed(() => state.activeTab),
    tabs: computed(() => (state.tabs ?? []).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    )),
    getIsTabOpen: (tabId: string) => computed(() => state.activeTab === tabId),
  };

  const tabActions = {
    activateTab: (tabId: string) => {
      state.activeTab = tabId;
    },
    replaceTabs: (newTabs: SheetTab[]) => {
      state.tabs = [...newTabs];
    },
    appendTabs: (newTabs: SheetTab[]) => {
      state.tabs = [...state.tabs, ...newTabs];
    },
  };

  // Document getters - common to all document sheets
  const documentGetters = {
    getProperty: <T,>(path: string) => computed(() => foundry.utils.getProperty(document.value, path) as T),
    type: computed(() => document.value.type),
    localizedType: computed(() => game.i18n.localize(document.value.localizedType)),
    getItemTypeDisplay: (fallback: string = 'D35E.Item') =>
      computed(() => game.i18n.localize(document.value.localizedType || fallback)),

    name: computed(() => document.value.name || ''),
    displayName: computed(() => document.value.displayName || ''),
    isNameFromFormula: computed(() => document.value.system.isNameFromFormula || false),
    nameFormula: computed(() => document.value.system.nameFormula || ''),

    img: computed(() => document.value.img || ''),

    uniqueId: computed(() => document.value.system.uniqueId || ''),

    description: computed(() => document.value.system.description.value || ''),
  };

  // Document actions
  const updateDocument = async (
    data: Partial<TDocument>,
    options: Partial<DatabaseUpdateOperation<TDocument>> = {},
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

  const documentActions = {
    updateDocument,
    getFieldUpdater: (path: string) => {
      return async (value: unknown) => {
        return await updateDocument({ [path]: value } as Partial<TDocument>);
      };
    },
  };

  return {
    isEditable: computed(() => state.isEditable),
    isFirstRender: computed(() => state.renderOptions?.isFirstRender),
    tabs: {
      tabGetters,
      tabActions,
    },
    _document: document as Ref<TDocument>,
    documentGetters,
    documentActions,
  };
};

type DocumentSheetStore<TDocument extends SheetDocument = SheetDocument> = {
  isEditable: ComputedRef<boolean>;
  isFirstRender: ComputedRef<boolean | undefined>;
  tabs: {
    tabGetters: {
      activeTabId: ComputedRef<string>;
      tabs: ComputedRef<(SheetTab & { order: number })[]>;
      getIsTabOpen: (tabId: string) => ComputedRef<boolean>;
    };
    tabActions: {
      activateTab: (tabId: string) => void;
      replaceTabs: (newTabs: SheetTab[]) => void;
      appendTabs: (newTabs: SheetTab[]) => void;
    };
  };
  _document: Ref<TDocument>;
  documentGetters: {
    getProperty: <T>(path: string) => ComputedRef<T>;
    type: ComputedRef<string>;
    localizedType: ComputedRef<string>;
    getItemTypeDisplay: (fallback?: string) => ComputedRef<string>;
    name: ComputedRef<string>;
    displayName: ComputedRef<string>;
    isNameFromFormula: ComputedRef<boolean>;
    nameFormula: ComputedRef<string>;
    img: ComputedRef<string>;
    uniqueId: ComputedRef<string>;
    description: ComputedRef<string>;
  };
  documentActions: {
    updateDocument: (data: Partial<TDocument>, options: Partial<DatabaseUpdateOperation<TDocument>>) => Promise<boolean>;
    getFieldUpdater: (path: string) => (value: unknown) => Promise<boolean>;
  };
};

export { useDocumentSheetStore };

export type {
  DocumentSheetStore,
  SheetDocument,
  SheetTab,
};
