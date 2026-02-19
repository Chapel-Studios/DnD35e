import type { DocumentSheetStore, SheetTab } from '@ec/CoreMixin/index.mjs';
import { useDocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/index.mjs';
import {
  defaultDescriptionTab,
  defaultNameConfigTab,
} from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';

const getDefaultItemTabs = (): SheetTab[] => [
  defaultDescriptionTab,
  defaultNameConfigTab,
];

const useItemSheetStore = <TDocument extends ItemDnd35e>(context: VueApplicationContext<TDocument>): ItemSheetStore<TDocument> => {
  // Get base store functionality
  const baseStore = useDocumentSheetStore(context, {
    defaultTabs: getDefaultItemTabs(),
    defaultActiveTab: 'description',
  });

  // Item-specific state

  // const getItemTypeDisplay = (fallback: string = 'D35E.Item') =>
  //   computed(() => game.i18n.localize(itemType || fallback));

  // Item-specific document getters
  const itemDocumentGetters = {
    ...baseStore.documentGetters,
  };

  return {
    ...baseStore,
    documentGetters: itemDocumentGetters,
    // Item-specific
  };
};

// TODO
type ItemSheetStore<TDocument extends ItemDnd35e<ItemType> = ItemDnd35e<ItemType>> = DocumentSheetStore<TDocument>;
// & {
//   // itemType: ComputedRef<string>;
//   setItemType: (newItemType: string) => void;
//   getItemTypeDisplay: (fallback?: string) => ComputedRef<string>;
// };

export {
  getDefaultItemTabs,
  useItemSheetStore,
};

export type {
  ItemSheetStore,
};
