import { Component, computed, reactive, ref, triggerRef, unref } from 'vue';
import type { BaseItemSheetRenderContext, ItemDnd35e } from '../index.mjs';
import { Description } from './index.mjs';
import NameConfig from './tabs/NameConfig.vue';
import { ItemType } from '@items/itemTypes.mjs';

interface ItemSheetTab {
  id: string;
  label: string;
  component: Component;
  order: number;
  icon?: string;
  tooltip?: string
}

type ItemSheetState = {
  itemType: string;
  tabs: ItemSheetTab[];
  activeTab: string;
};

const createDefaultState = (): ItemSheetState => ({
  itemType: 'D35E.Item',
  tabs: [
    {
      id: 'description',
      label: 'D35E.Description',
      component: Description,
      order: 10,
    },
    {
      id: 'name-config',
      label: 'D35E.Name',
      component: NameConfig,
      order: 10,
    },
  ] satisfies ItemSheetTab[],
  activeTab: 'description',
});

const useItemSheetStore = <TDocument extends ItemDnd35e> (context: BaseItemSheetRenderContext<ItemType, TDocument>) => {
  // Core state
  const document = ref(context.document);
  const state = reactive({
    ...createDefaultState(),
    // document:
    isEditable: context.editable,
    renderOptions: unref(context.renderOptions),
  });
  const setItemType = (itemType: string) => {
    state.itemType = itemType;
  };
  const getItemTypeDisplay = (fallback: string = 'D35E.Item') =>
    computed(() => game.i18n.localize(state.itemType || fallback));

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
    replaceTabs: (newTabs: ItemSheetTab[]) => {
      state.tabs = [
        ...newTabs,
      ];
    },
    appendTabs: (newTabs: ItemSheetTab[]) => {
      state.tabs = [
        ...state.tabs,
        ...newTabs,
      ];
    },
  };

  // Document
  const documentGetters = {
    getProperty: <T, >(path: string) => computed(() => foundry.utils.getProperty(document.value, path) as T),

    name: computed(() => document.value.name || ''),
    displayName: computed(() => document.value.displayName || ''),
    isNameFromFormula: computed(() => document.value.system.isNameFromFormula || false),
    nameFormula: computed(() => document.value.system.nameFormula || ''),

    img: computed(() => document.value.img || ''),

    uniqueId: computed(() => document.value.system.uniqueId || ''),

    description: computed(() => document.value.system.description.value || ''),

    localizedType: computed(() => game.i18n.localize(document.value.localizedType)),
  };
  const updateDocument = async (data: Partial<TDocument>) => {
    const updatedDoc = await document.value.update(data) as TDocument;
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
      return async (value: any) => {
        return await updateDocument({ [path]: value } as Partial<TDocument>);
      };
    },
  };

  return {
    itemType: computed(() => state.itemType),
    setItemType,
    getItemTypeDisplay,
    isEditable: computed(() => state.isEditable),
    isFirstRender: computed(() => state.renderOptions.isFirstRender),
    tabs: {
      tabGetters,
      tabActions,
    },
    _document: document,
    documentGetters,
    documentActions,
  };
};

type ItemSheetStore<TDocument extends ItemDnd35e<ItemType> = ItemDnd35e<ItemType>> = ReturnType<typeof useItemSheetStore<TDocument>>;

export { useItemSheetStore };

export type {
  ItemSheetTab,
  ItemSheetStore,
};
