import type { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { ItemDocumentActions, ItemDocumentGetters, ItemSheetStore, ItemSheetStoreUtils } from '@items/baseItem/index.mjs';
import type { EquippableItemLike } from '@items/components/Equippable/index.mjs';
import type { PhysicalItemActions, PhysicalItemGetters, PhysicalItemLike, PhysicalItemStore, PhysicalItemStoreUtils } from '@items/components/Physical/index.mjs';
import { usePhysicalItemStore } from '@items/components/Physical/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef, ShallowRef } from 'vue';
import { computed } from 'vue';


const useEquippableItemStore = <TDocument extends EquippableItemLike> (context: VueApplicationContext<TDocument>, baseStore: ItemSheetStore) => {
  const document = baseStore._storeUtils.document as ShallowRef<TDocument>;
  const physicalStore = usePhysicalItemStore(context, baseStore as ItemSheetStore<PhysicalItemLike>);

  const documentGetters: EquippableItemGetters = {
    ...physicalStore.documentGetters,
    isEquipped: computed(() => document.value.system.isEquipped),
    equippedSlotIds: computed(() => document.value.system.equippedSlotIds),
    isMelded: computed(() => document.value.system.isMelded),
    designedForSize: computed(() => document.value.system.designedForSize.value),
    isWeightlessWhenEquipped: computed(() => document.value.system.isWeightlessWhenEquipped),
  };

  return {
    ...physicalStore,
    documentGetters,
  };
};

interface EquippableItemGetters extends PhysicalItemGetters {
  isEquipped: ComputedRef<boolean>;
  equippedSlotIds: ComputedRef<string[]>;
  isMelded: ComputedRef<boolean>;
  designedForSize: ComputedRef<string>;
  isWeightlessWhenEquipped: ComputedRef<boolean>;
}

interface EquippableItemStoreUtils extends PhysicalItemStoreUtils {}

interface EquippableItemActions extends PhysicalItemActions {}

type EquippableItemStore = PhysicalItemStore & {
  documentGetters: EquippableItemGetters;
  _storeUtils: EquippableItemStoreUtils;
  actions: EquippableItemActions;
};

interface EquippableDocumentStore extends EquippableItemStore, DocumentSheetStore<EquippableItemLike> {
  _storeUtils: EquippableItemStoreUtils & ItemSheetStoreUtils<EquippableItemLike>;
  documentGetters: EquippableItemGetters & ItemDocumentGetters;
  documentActions: EquippableItemActions & ItemDocumentActions<EquippableItemLike>;
}

export type {
  EquippableDocumentStore,
  EquippableItemActions,
  EquippableItemGetters,
  EquippableItemStore,
  EquippableItemStoreUtils,
};

export {
  useEquippableItemStore,
};
