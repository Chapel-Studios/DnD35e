import type { DocumentSheetStore } from '@documents/document/index.mjs';
import { syncMasterworkAeState } from '@effects/material/logic/masterworkAe.mjs';
import type { ItemDocumentActions, ItemDocumentGetters, ItemSheetStore, ItemSheetStoreUtils } from '@items/baseItem/index.mjs';
import type { EquippableItemLike } from '@items/physical/equippableItem/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef, ShallowRef } from 'vue';
import { computed } from 'vue';

import type { PhysicalItemLike } from '../../physicalItem/PhysicalItem.mjs';
import type { PhysicalItemActions, PhysicalItemGetters, PhysicalItemStore, PhysicalItemStoreUtils } from '../../physicalItem/sheet/PhysicalItemStore.mjs';
import { usePhysicalItemStore } from '../../physicalItem/sheet/PhysicalItemStore.mjs';


const useEquippableItemStore = <TDocument extends EquippableItemLike> (context: VueApplicationContext<TDocument>, baseStore: ItemSheetStore) => {
  const document = baseStore._storeUtils.document as ShallowRef<TDocument>;
  const physicalStore = usePhysicalItemStore(context, baseStore as ItemSheetStore<PhysicalItemLike>);

  const documentGetters: EquippableItemGetters = {
    ...physicalStore.documentGetters,
    isEquipped: computed(() => document.value.system.isEquipped),
    equippedSlotIds: computed(() => document.value.system.equippedSlotIds),
    isMelded: computed(() => document.value.system.isMelded),
    designedForSize: computed(() => document.value.system.designedForSize),
    isWeightlessWhenEquipped: computed(() => document.value.system.isWeightlessWhenEquipped),
    isMasterwork: computed(() => document.value.system.isMasterwork ?? false),
  };

  const documentActions: EquippableItemActions = {
    ...physicalStore.documentActions,
    toggleMasterwork: async (value: boolean) => {
      await syncMasterworkAeState(document.value as unknown as EquippableItemLike, value);
    },
  };

  return {
    ...physicalStore,
    documentGetters,
    documentActions,
  };
};

interface EquippableItemGetters extends PhysicalItemGetters {
  isEquipped: ComputedRef<boolean>;
  equippedSlotIds: ComputedRef<string[]>;
  isMelded: ComputedRef<boolean>;
  designedForSize: ComputedRef<string>;
  isWeightlessWhenEquipped: ComputedRef<boolean>;
  isMasterwork: ComputedRef<boolean>;
}

interface EquippableItemStoreUtils extends PhysicalItemStoreUtils {}

interface EquippableItemActions extends PhysicalItemActions {
  toggleMasterwork: (value: boolean) => Promise<void>;
}

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
