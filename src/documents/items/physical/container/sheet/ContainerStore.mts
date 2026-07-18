import type { CurrencyData } from '@fields/index.mjs';
import type { PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
import type { PhysicalDocumentStore } from '@items/physical/physicalItem/index.mjs';
import { usePhysicalItemStore } from '@items/physical/physicalItem/index.mjs';
import { physicalItemEffectsTab } from '@items/physical/physicalItem/sheet/tabs/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import type { Container } from '../Container.mjs';
import { containerDetailsTab, containerInventoryTab } from './index.mjs';

const useContainerStore = (context: VueApplicationContext<Container>): ContainerStore => {
  const physicalStore = usePhysicalItemStore<Container>(context, {
    defaultTabs: [containerDetailsTab, containerInventoryTab, physicalItemEffectsTab],
    defaultActiveTab: 'details',
  });
  const document = physicalStore._storeUtils.document;

  const documentGetters = {
    ...physicalStore.documentGetters,
    maxContentWeight: computed(() => document.value.system.maxContentWeight),
    contentsAreWeightless: computed(() => document.value.system.contentsAreWeightless),
    contentsWeight: computed(() => document.value.system.contentsWeight),
    contentsCount: computed(() => document.value.system.contentsCount),
    contentsValue: computed(() => document.value.system.contentsValue),
    isOverCapacity: computed(() => document.value.system.isOverCapacity),
    getContents: async () => {
      const contents = await document.value.getContents() as PHYSICAL_ITEMS[];
      return computed(() => contents);
    },
  };

  const store: ContainerStore = {
    ...physicalStore,
    documentGetters,
  };

  game.dnd35e.stores[document.value.documentName][context.document.id] = store;

  return store;
};

interface ContainerGetters {
  maxContentWeight: ComputedRef<number | null>;
  contentsAreWeightless: ComputedRef<boolean>;
  contentsWeight: ComputedRef<number>;
  contentsCount: ComputedRef<number>;
  isOverCapacity: ComputedRef<boolean>;
  contentsValue: ComputedRef<CurrencyData>;
  getContents: () => Promise<ComputedRef<PHYSICAL_ITEMS[]>>;
}

type ContainerStore = PhysicalDocumentStore<Container> & {
  documentGetters: PhysicalDocumentStore<Container>['documentGetters'] & ContainerGetters;
};

export { useContainerStore };
export type { ContainerGetters, ContainerStore };
