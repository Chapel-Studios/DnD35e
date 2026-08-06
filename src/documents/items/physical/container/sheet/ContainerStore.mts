import type { RenderModeStore } from '@documents/document/sheet/stores/RenderModeStore.mjs';
import { CurrencyData } from '@fields/index.mjs';
import type { PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import type { PhysicalDocumentStore } from '@items/physical/physicalItem/index.mjs';
import { usePhysicalItemStore } from '@items/physical/physicalItem/index.mjs';
import { physicalItemEffectsTab } from '@items/physical/physicalItem/sheet/tabs/index.mjs';
import { type SettingsStore, SettingsStoreSymbol } from '@settings/shared/sheet/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed, inject } from 'vue';

import type { Container } from '../Container.mjs';
import { containerDetailsTab, containerInventoryTab } from './index.mjs';

interface UseContainerStoreOptions {
  /** Set false for row-scoped stores so they don't clobber a standalone sheet's registry entry (or vice versa). */
  registerGlobally?: boolean;
  /** See `useDocumentSheetStore`'s option of the same name. */
  renderModeStore?: RenderModeStore;
}

const useContainerStore = (context: VueApplicationContext<Container>, options: UseContainerStoreOptions = {}): ContainerStore => {
  const physicalStore = usePhysicalItemStore<Container>(context, {
    defaultTabs: [containerDetailsTab, containerInventoryTab, physicalItemEffectsTab],
    defaultActiveTab: 'details',
    renderModeStore: options.renderModeStore,
  });
  const document = physicalStore._storeUtils.document;
  
  const {
    currency: { highestVisibleCoin },
  } = inject(SettingsStoreSymbol) as SettingsStore;
  
  const documentGetters = {
    ...physicalStore.documentGetters,
    maxContentWeight: computed(() => document.value.system.maxContentWeight),
    contentsAreWeightless: computed(() => document.value.system.contentsAreWeightless),
    contentsWeight: computed(() => document.value.system.contentsWeight),
    contentsCount: computed(() => document.value.system.contentsCount),
    contentsValue: computed(() => {
      return CurrencyData.fromStacks(document.value.system.contentsValue.consolidate(highestVisibleCoin.value));
    }),
    isOverCapacity: computed(() => document.value.system.isOverCapacity),
    contents: computed(() => document.value.getContentsSync() as PHYSICAL_ITEMS[]),
  };

  const store: ContainerStore = {
    ...physicalStore,
    documentGetters,
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
}

type ContainerStore = PhysicalDocumentStore<Container> & {
  documentGetters: PhysicalDocumentStore<Container>['documentGetters'] & ContainerGetters;
};

export { useContainerStore };
export type { ContainerGetters, ContainerStore, UseContainerStoreOptions };
