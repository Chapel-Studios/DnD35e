import type {
  DocumentSheetStore,
  DocumentSheetStoreDocumentActions,
  DocumentSheetStoreDocumentGetters,
  DocumentSheetStoreUtils,
  SheetTab,
} from '@documents/document/index.mjs';
import { defaultDetailsTab, useDocumentSheetStore } from '@documents/document/index.mjs';
import type { EffectDocumentActions, EffectDocumentGetters, EffectDocumentUtils } from '@documents/document/logic/index.mjs';
import { useEffectDocumentActions } from '@documents/document/logic/index.mjs';
import type { ItemDnd35e } from '@items/baseItem/ItemDnd35e.mjs';
import type { ItemType } from '@items/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import {
  defaultEffectsTab,
} from './tabs/index.mjs';

const getDefaultItemTabs = (): SheetTab[] => [
  defaultDetailsTab,
  defaultEffectsTab,
];

interface UseItemSheetStoreOptions {
  defaultTabs?: SheetTab[];
  defaultActiveTab?: string;
}

const useItemSheetStore = <TDocument extends ItemDnd35e>(
  context: VueApplicationContext<TDocument>,
  options?: UseItemSheetStoreOptions
): ItemSheetStore<TDocument> => {
  // Get base store functionality
  const baseStore = useDocumentSheetStore(context, {
    defaultTabs: options?.defaultTabs ?? getDefaultItemTabs(),
    defaultActiveTab: options?.defaultActiveTab ?? 'details',
  });
  const document = baseStore._storeUtils.document;
  baseStore._storeUtils.setGetFreshDocument(async (uuid: string) => {
    // `game.items.get(id)` would only resolve world-collection items - an item embedded
    // in an unlinked token's synthetic Actor shares its base counterpart's `.id` but has
    // a distinct `.uuid`, so it must be resolved via `fromUuid`.
    const doc = await foundry.utils.fromUuid(uuid);
    return (doc ?? null) as TDocument | null;
  });

  const hasOwner = computed(() => !!document.value.parent);

  // Item-specific document getters/actions - shared with actor-level effect
  // hosting via `useEffectDocumentActions` (extracted for DRY across Item/Actor sheets).
  const { getters: effectGetters, actions: effectActions, utils: effectUtils } = useEffectDocumentActions(document);

  const itemDocumentGetters = {
    ...baseStore.documentGetters,
    ...effectGetters,
    hasOwner,
  };

  const itemDocumentActions = {
    ...baseStore.documentActions,
    ...effectActions,
  };

  const itemStoreUtils = {
    ...baseStore._storeUtils,
    ...effectUtils,
  };

  const store: ItemSheetStore<TDocument> = {
    ...baseStore,
    documentGetters: itemDocumentGetters,
    documentActions: itemDocumentActions,
    _storeUtils: itemStoreUtils,
    // Item-specific
  };

  return store;
};


type ItemDocumentGetters = DocumentSheetStoreDocumentGetters & EffectDocumentGetters & {
  hasOwner: ComputedRef<boolean>;
};

type ItemDocumentActions<TDocument extends ItemDnd35e> = DocumentSheetStoreDocumentActions<TDocument> & EffectDocumentActions;

type ItemSheetStoreUtils<TDocument extends ItemDnd35e> = DocumentSheetStoreUtils<TDocument> & EffectDocumentUtils;

type ItemSheetStore<TDocument extends ItemDnd35e<ItemType> = ItemDnd35e<ItemType>> = DocumentSheetStore<TDocument>
  & {
    documentGetters: ItemDocumentGetters,
    documentActions: ItemDocumentActions<TDocument>,
    _storeUtils: ItemSheetStoreUtils<TDocument>,
  };

export {
  getDefaultItemTabs,
  useItemSheetStore,
};

export type {
  ItemDocumentActions,
  ItemDocumentGetters,
  ItemSheetStore,
  ItemSheetStoreUtils,
  UseItemSheetStoreOptions,
};
