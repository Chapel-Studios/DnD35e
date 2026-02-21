import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { IdentifiableStore } from '@ec/Identifiable/index.mjs';
import { useIdentifiableStore } from '@ec/Identifiable/index.mjs';
import type { MaterialType } from '@effects/material/index.mjs';
import { materialItemType } from '@effects/material/index.mjs';
import type { ItemSheetStore } from '@items/baseItem/index.mjs';
import type { PhysicalItemLike } from '@items/components/Physical/index.mjs';
import type { VueApplicationContext } from '@vueApps/index.mjs';
import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';


const usePhysicalItemStore = <TDocument extends PhysicalItemLike = PhysicalItemLike>(context: VueApplicationContext<TDocument>, baseStore: ItemSheetStore<TDocument>): PhysicalItemStore => {
  const document = baseStore._document as Ref<TDocument>;
  const identifiableStore = useIdentifiableStore(
    context,
    baseStore as DocumentSheetStore<TDocument>,
  );

  const physicalItemGetters = {
    quantity: computed(() => document.value.system.quantity),
    weight: computed(() => document.value.system.weight),
    price: computed(() => document.value.system.price),
    resalePrice: computed(() => document.value.system.resalePrice),
    brokenResalePrice: computed(() => document.value.system.brokenResalePrice),
    isBroken: computed(() => document.value.system.isBroken),
    maxHp: computed(() => document.value.system.hp.max),
    currentHp: computed(() => document.value.system.hp.value),
    hardness: computed(() => document.value.system.hardness),
    possibleContainers: computed(() => {
      // TODO: build this out after implementing containers
      return [{ value: null, label: game.i18n.localize('D35E.None') }];
    }),
    currentContainerId: computed(() => document.value.system.containerId),
    isCarried: computed(() => document.value.system.isCarried),
    size: computed(() => game.i18n.localize(document.value.system.size)),
    materials: computed(() => 
      document.value.effects
        .filter((effect) => effect.type === materialItemType)
        .map((effect) => effect as unknown as MaterialType),
    ),
  };

  return {
    ...identifiableStore,
    physicalItemGetters,
  };
};

interface PhysicalItemStore extends IdentifiableStore {
  physicalItemGetters: {
    quantity: ComputedRef<number>;
    weight: ComputedRef<number | null>;
    price: ComputedRef<number | null>;
    resalePrice: ComputedRef<number | null>;
    brokenResalePrice: ComputedRef<number | null>;
    isBroken: ComputedRef<boolean>;
    maxHp: ComputedRef<number>;
    currentHp: ComputedRef<number>;
    hardness: ComputedRef<number | null>;
    possibleContainers: ComputedRef<Array<{ value: null; label: string }>>;
    currentContainerId: ComputedRef<string | null>;
    isCarried: ComputedRef<boolean>;
    size: ComputedRef<string>;
    materials: ComputedRef<MaterialType[]>;
  };
}

interface PhysicalDocumentStore extends PhysicalItemStore, ItemSheetStore<PhysicalItemLike> {}

export { usePhysicalItemStore };
export type {
  PhysicalDocumentStore,
  PhysicalItemStore,
};
