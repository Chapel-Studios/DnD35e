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
    maxHp: computed(() =>  document.value.system.hp.max),
    currentHp: computed(() => document.value.system.hp.value),
  };

  return  {
    ...identifiableStore,
    physicalItemGetters,
  };
};

export { usePhysicalItemStore };
export type PhysicalItemSheetStore = ReturnType<typeof usePhysicalItemStore> & ItemSheetStore;
