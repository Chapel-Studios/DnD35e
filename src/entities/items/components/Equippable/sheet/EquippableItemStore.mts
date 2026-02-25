import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { ItemSheetStore } from '@items/baseItem/index.mjs';
import type { EquippableItemLike } from '@items/components/Equippable/index.mjs';
import type { PhysicalItemLike, PhysicalItemStore } from '@items/components/Physical/index.mjs';
import { usePhysicalItemStore } from '@items/components/Physical/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';


const useEquippableItemStore = <TDocument extends EquippableItemLike> (context: VueApplicationContext<TDocument>, baseStore: ItemSheetStore) => {
  const document = baseStore._document as unknown as Ref<TDocument>;
  const physicalStore = usePhysicalItemStore(context, baseStore as ItemSheetStore<PhysicalItemLike>);

  const equippableGetters = {
    isEquipped: computed(() => document.value.system.isEquipped),
    equippedSlotIds: computed(() => document.value.system.equippedSlotIds),
    isMelded: computed(() => document.value.system.isMelded),
    designedForSize: computed(() => document.value.system.designedForSize),
    isWeightlessWhenEquipped: computed(() => document.value.system.isWeightlessWhenEquipped),
  };

  return {
    ...physicalStore,
    equippableGetters,
  };
};

type EquippableItemStore = PhysicalItemStore & {
  equippableGetters: {
    isEquipped: ComputedRef<boolean>;
    equippedSlotIds: ComputedRef<string[]>;
    isMelded: ComputedRef<boolean>;
    designedForSize: ComputedRef<string>;
    isWeightlessWhenEquipped: ComputedRef<boolean>;
  };
};

interface EquippableDocumentStore extends EquippableItemStore, DocumentSheetStore<EquippableItemLike> {}

export type {
  EquippableDocumentStore,
  EquippableItemStore,
};

export {
  useEquippableItemStore,
};
