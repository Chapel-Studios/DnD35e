import { ItemSheetStore } from "@items/baseItem/index.mjs";
import type { PhysicalItemSheetRenderContext } from "./index.mjs";
import { useIdentifiableStore } from "@items/components/Identifiable/index.mjs";
import { computed, type Ref } from "vue";
import { PhysicalItemLike } from "../PhysicalItemDnd35e.mjs";

const usePhysicalItemStore = (context: PhysicalItemSheetRenderContext, baseStore: ItemSheetStore) => {
  const document = baseStore._document as unknown as Ref<PhysicalItemLike>;
  baseStore.setItemType('D35E.PhysicalItem');
  const identifiableStore = useIdentifiableStore(context, baseStore);

  const physicalItemGetters = {
    quantity: computed(() =>  document.value.system.quantity),
    weight: computed(() =>  document.value.system.weight),
    price: computed(() =>  document.value.system.price),
    resalePrice: computed(() =>  document.value.system.resalePrice),
    brokenResalePrice: computed(() =>  document.value.system.brokenResalePrice),
    isBroken: computed(() =>  document.value.system.isBroken),
    maxHp: computed(() =>  document.value.system.hp.max),
    currentHp: computed(() => document.value.system.hp.value),
    hardness: computed(() => document.value.system.hardness),
    possibleContainers: computed(() => {
      // TODO: build this out after implementing containers
      return [{ value: null, label: game.i18n.localize('D35E.None') }];
    }),
    currentContainerId: computed(() => document.value.system.containerId),
    isCarried: computed(() => document.value.system.isCarried),
    size: computed(() => game.i18n.localize(document.value.system.size)),
  };

  return  {
    ...identifiableStore,
    physicalItemGetters,
  };
};

export { usePhysicalItemStore };
export type PhysicalItemSheetStore = ReturnType<typeof usePhysicalItemStore> & ItemSheetStore;
