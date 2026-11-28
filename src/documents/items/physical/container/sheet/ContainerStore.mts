import { createItemRowStoreCache, type ItemRowStore } from '@actors/baseActor/sheet/components/itemRowStoreRegistry.mjs';
import type { UseDocumentStoreOptions } from '@documents/document/sheet/DocumentSheetStore.mjs';
import { CurrencyData } from '@fields/index.mjs';
import { ammoItemType, containerItemType, type ItemType, type PHYSICAL_ITEMS, weaponItemType } from '@items/itemTypes.mjs';
import type { PhysicalDocumentStore } from '@items/physical/physicalItem/index.mjs';
import { usePhysicalItemStore } from '@items/physical/physicalItem/index.mjs';
import { physicalItemEffectsTab } from '@items/physical/physicalItem/sheet/tabs/index.mjs';
import { type SettingsStore, SettingsStoreSymbol } from '@settings/shared/sheet/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed, inject, shallowRef, watch } from 'vue';

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

  const contents = shallowRef<PHYSICAL_ITEMS[]>([]);
  let contentsRefreshVersion = 0;
  let pendingContentsRefresh = Promise.resolve();
  watch(document, (container) => {
    const version = ++contentsRefreshVersion;
    pendingContentsRefresh = (async () => {
      const resolvedContents = await container.getContents();
      if (version !== contentsRefreshVersion) return;
      await refreshItemRowStores(resolvedContents);
      if (version === contentsRefreshVersion) contents.value = resolvedContents;
    })();
    void pendingContentsRefresh.catch((error: unknown) => {
      const failure = error instanceof Error
        ? error
        : new Error(String(error));
      Hooks.onError('ContainerStore#refreshContents', failure, {
        log: 'error',
        notify: 'error',
      });
    });
  }, { immediate: true, flush: 'sync' });
  
  const containerType = computed(() => getViewAwareFieldValue<ContainerTypeOption>('system.containerType'));
  const isPurse = computed(() => containerType.value === CONTAINER_TYPE.PURSE);
  const documentGetters = {
    ...physicalStore.documentGetters,
    containerType,
    isPurse,
    isQuiver: computed(() => containerType.value === CONTAINER_TYPE.QUIVER),
    containerTypeLabel: computed(() => game.i18n.localize(CONTAINER_TYPE_LOCALIZED[containerType.value])),
    maxContentWeight: computed(() => document.value.system.maxContentWeight),
    contentsAreWeightless: computed(() => document.value.system.contentsAreWeightless),
    contentsWeight: computed(() => document.value.system.contentsWeight),
    contentsCount: computed(() => document.value.system.contentsCount),
    contentsValue: computed(() => {
      return CurrencyData.fromStacks(document.value.system.contentsValue.consolidate(highestVisibleCoin.value));
    }),
    isOverCapacity: computed(() => document.value.system.isOverCapacity),
    contents: computed(() => contents.value),
    allowsCurrency: computed(() => isPurse.value || getViewAwareFieldValue<boolean>('system.allowsCurrency')),
    allowedItemTypes: computed(() => [
      ...(getViewAwareFieldValue<Iterable<ItemType> | null>('system.allowedItemTypes') ?? []),
    ]),
    allowedItemSubtypes: computed(() => ({
      [weaponItemType]: [...(getViewAwareFieldValue<Iterable<string> | null>(`system.allowedItemSubtypes.${weaponItemType}`) ?? [])],
      [ammoItemType]: [...(getViewAwareFieldValue<Iterable<string> | null>(`system.allowedItemSubtypes.${ammoItemType}`) ?? [])],
      [containerItemType]: [...(getViewAwareFieldValue<Iterable<string> | null>(`system.allowedItemSubtypes.${containerItemType}`) ?? [])],
    })),
    getOrCreateItemRowStore,
  };

  const store: ContainerStore = {
    ...physicalStore,
    documentGetters,
    _storeUtils: {
      ...physicalStore._storeUtils,
      refreshDocument: async (doc?: Container | null): Promise<void> => {
        await physicalStore._storeUtils.refreshDocument(doc);
        await pendingContentsRefresh;
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
  allowedItemSubtypes: ComputedRef<Record<ItemType, string[]>>;
  getOrCreateItemRowStore: (item: PHYSICAL_ITEMS) => ItemRowStore;
}

type ContainerStore = PhysicalDocumentStore<Container> & {
  documentGetters: PhysicalDocumentStore<Container>['documentGetters'] & ContainerGetters;
};

export { useContainerStore };
export type { ContainerGetters, ContainerStore };
