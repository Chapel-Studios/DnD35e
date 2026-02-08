import type { ItemSheetStore } from '@items/baseItem/index.mjs';
import type { EquippableItemSheetRenderContext, EquippableItemLike } from '@items/components/Equippable/index.mjs';
import { useItemWithMaterialsStore } from '@items/components/HasMaterial/index.mjs';
import { usePhysicalItemStore } from '@items/components/Physical/index.mjs';
import { computed, type Ref } from 'vue';

const useEquippableItemStore = <TDocument extends EquippableItemLike> (context: EquippableItemSheetRenderContext, baseStore: ItemSheetStore<TDocument>) => {
  const document = baseStore._document as unknown as Ref<TDocument>;
  const physicalStore = usePhysicalItemStore(context, baseStore);
  const hasMaterialStore = useItemWithMaterialsStore(context, baseStore);

  const equippableGetters = {
    isEquipped: computed(() => document.value.system.isEquipped),
    equippedSlotIds: computed(() => document.value.system.equippedSlotIds),
    isMelded: computed(() => document.value.system.isMelded),
    designedForSize: computed(() => document.value.system.designedForSize),
    isWeightlessWhenEquipped: computed(() => document.value.system.isWeightlessWhenEquipped),
  };

  return {
    ...physicalStore,
    ...hasMaterialStore,
    equippableGetters,
  };
};

type EquippableItemStore = ReturnType<typeof useEquippableItemStore> & ItemSheetStore;

export type {
  EquippableItemStore,
};

export {
  useEquippableItemStore,
};
