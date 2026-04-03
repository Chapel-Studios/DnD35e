import type { Component, ComputedRef } from 'vue';
import { computed, reactive } from 'vue';

type TabStoreOptions = {
  defaultTabs?: SheetTab[];
  defaultActiveTab?: string;
};

type TabsState = {
  tabs: SheetTab[];
  activeTab: string;
};

type SheetTab = {
  id: string;
  label: string;
  component: Component;
  order: number;
  icon?: string;
  tooltip?: string;
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

interface TabStore extends DocumentSheetStoreTabActions, DocumentSheetStoreTabGetters {}

const defaultTabStoreOptions: Required<TabStoreOptions> = {
  defaultTabs: [],
  defaultActiveTab: '',
};

const useTabStore = (options: TabStoreOptions = {}): TabStore => {
  const { defaultTabs, defaultActiveTab } = { ...defaultTabStoreOptions, ...options };
  const state: TabsState = reactive({
    tabs: defaultTabs,
    activeTab: defaultActiveTab || defaultTabs[0]?.id || '',
  });

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

  return {
    ...tabGetters,
    ...tabActions,
  };
};

const TabStoreSymbol = Symbol('TabStore');

export {
  defaultTabStoreOptions,
  TabStoreSymbol,
  useTabStore,
};

export type {
  DocumentSheetStoreTabActions,
  DocumentSheetStoreTabGetters,
  SheetTab,
  TabsState,
  TabStore,
  TabStoreOptions,
};
