import { ItemSheetStore } from '@items/baseItem/index.mjs';
import type { ItemWithMaterialsLike, ItemWithMaterialsSheetRenderContext } from '@items/components/HasMaterial/index.mjs';
import { computed, type Ref } from 'vue';

const useItemWithMaterialsStore = (_context: ItemWithMaterialsSheetRenderContext, baseStore: ItemSheetStore) => {
  const document = baseStore._document as unknown as Ref<ItemWithMaterialsLike>;

  const itemWithMaterialsGetters = {
    materials: computed(() => document.value.system.materials),
  };

  return {
    itemWithMaterialsGetters,
  };
};

type ItemWithMaterialsStore = ReturnType<typeof useItemWithMaterialsStore>;

export { useItemWithMaterialsStore };

export type {
  ItemWithMaterialsStore,
};
