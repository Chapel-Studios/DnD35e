import { createItemRowStoreCache, type ItemRowStore } from '@actors/baseActor/sheet/components/itemRowStoreRegistry.mjs';
import type { UseDocumentStoreOptions } from '@documents/document/sheet/DocumentSheetStore.mjs';
import { CurrencyData } from '@fields/index.mjs';
import type { ItemType, PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import type { PhysicalDocumentStore } from '@items/physical/physicalItem/index.mjs';
import { usePhysicalItemStore } from '@items/physical/physicalItem/index.mjs';
import { physicalItemEffectsTab } from '@items/physical/physicalItem/sheet/tabs/index.mjs';
import { type SettingsStore, SettingsStoreSymbol } from '@settings/shared/sheet/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed, inject } from 'vue';

import type { Container } from '../Container.mjs';
import { CONTAINER_TYPE, CONTAINER_TYPE_LOCALIZED, type ContainerTypeOption } from '../data/constants.mjs';
import { containerDetailsTab, containerInventoryTab } from './index.mjs';

const useContainerStore = (context: VueApplicationContext<Container>, options: UseDocumentStoreOptions = {}): ContainerStore => {
  const physicalStore = usePhysicalItemStore<Container>(context, {
    defaultTabs: [containerDetailsTab, containerInventoryTab, physicalItemEffectsTab],
    defaultActiveTab: 'details',
    renderModeStore: options.renderModeStore,
  });
  const document = physicalStore._storeUtils.document;
  const getViewAwareFieldValue = physicalStore.documentGetters.getViewAwareFieldValue;
  const { getOrCreateItemRowStore, refreshItemRowStores } = createItemRowStoreCache(physicalStore._storeUtils.renderModeStore);
  
  const {
    currency: { highestVisibleCoin },
  } = inject(SettingsStoreSymbol) as SettingsStore;
  
  const documentGetters = {
    ...physicalStore.documentGetters,
    containerType: computed(() => document.value.system.containerType),
    isPurse: computed(() => document.value.system.containerType === CONTAINER_TYPE.PURSE),
    isQuiver: computed(() => document.value.system.containerType === CONTAINER_TYPE.QUIVER),
    containerTypeLabel: computed(() => game.i18n.localize(CONTAINER_TYPE_LOCALIZED[document.value.system.containerType])),
    maxContentWeight: computed(() => document.value.system.maxContentWeight),
    contentsAreWeightless: computed(() => document.value.system.contentsAreWeightless),
    contentsWeight: computed(() => document.value.system.contentsWeight),
    contentsCount: computed(() => document.value.system.contentsCount),
    contentsValue: computed(() => {
      return CurrencyData.fromStacks(document.value.system.contentsValue.consolidate(highestVisibleCoin.value));
    }),
    isOverCapacity: computed(() => document.value.system.isOverCapacity),
    contents: computed(() => document.value.getContentsSync() as PHYSICAL_ITEMS[]),
    allowsCurrency: computed(() => document.value.system.allowsCurrency),
    allowedItemTypes: computed(() => [
      ...(getViewAwareFieldValue<Iterable<ItemType> | null>('system.allowedItemTypes') ?? []),
    ]),
    allowedItemSubtypes: computed(() => [
      ...(getViewAwareFieldValue<Iterable<string> | null>('system.allowedItemSubtypes') ?? []),
    ]),
    getOrCreateItemRowStore,
  };

  const store: ContainerStore = {
    ...physicalStore,
    documentGetters,
    _storeUtils: {
      ...physicalStore._storeUtils,
      refreshDocument: async (doc?: Container | null): Promise<void> => {
        await physicalStore._storeUtils.refreshDocument(doc);
        await refreshItemRowStores(documentGetters.contents.value);
      },
    },
  };

  if (options.registerGlobally ?? true) {
    game.dnd35e.stores[document.value.documentName][context.document.uuid] = store;
  }

  return store;
};

interface ContainerGetters {
  maxContentWeight: ComputedRef<number | null>;
  contentsAreWeightless: ComputedRef<boolean>;
  contentsWeight: ComputedRef<number>;
  contentsCount: ComputedRef<number>;
  isOverCapacity: ComputedRef<boolean>;
  contentsValue: ComputedRef<CurrencyData>;
  contents: ComputedRef<PHYSICAL_ITEMS[]>;
  allowsCurrency: ComputedRef<boolean>;
  containerType: ComputedRef<ContainerTypeOption>;
  isPurse: ComputedRef<boolean>;
  isQuiver: ComputedRef<boolean>;
  containerTypeLabel: ComputedRef<string>;
  allowedItemTypes: ComputedRef<ItemType[] | null>;
  allowedItemSubtypes: ComputedRef<string[] | null>;
  getOrCreateItemRowStore: (item: PHYSICAL_ITEMS) => ItemRowStore;
}

type ContainerStore = PhysicalDocumentStore<Container> & {
  documentGetters: PhysicalDocumentStore<Container>['documentGetters'] & ContainerGetters;
};

export { useContainerStore };
export type { ContainerGetters, ContainerStore };
