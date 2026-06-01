import { syncMasterworkAeState } from '@effects/material/logic/masterworkAe.mjs';
import type { ItemDocumentActions, ItemDocumentGetters, ItemSheetStoreUtils } from '@items/baseItem/index.mjs';
import type { EquippableItemLike } from '@items/physical/equippableItem/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef, ShallowRef } from 'vue';
import { computed } from 'vue';

import type { PhysicalDocumentStore, PhysicalItemActions, PhysicalItemGetters, PhysicalItemStore, PhysicalItemStoreUtils, UsePhysicalItemStoreOptions } from '../../physicalItem/sheet/PhysicalItemStore.mjs';
import { usePhysicalItemStore } from '../../physicalItem/sheet/PhysicalItemStore.mjs';

type UseEquippableItemStoreOptions = UsePhysicalItemStoreOptions;

const useEquippableItemStore = <TDocument extends EquippableItemLike> (
  context: VueApplicationContext<TDocument>,
  options?: UseEquippableItemStoreOptions
): EquippableDocumentStore<TDocument> => {
  const physicalStore = usePhysicalItemStore<TDocument>(context, options);
  const document = physicalStore._storeUtils.document as ShallowRef<TDocument>;

  const documentGetters = {
    ...physicalStore.documentGetters,
    isEquipped: computed(() => document.value.system.isEquipped),
    equippedSlotIds: computed(() => document.value.system.equippedSlotIds),
    isMelded: computed(() => document.value.system.isMelded),
    designedForSize: computed(() => document.value.system.designedForSize),
    isWeightlessWhenEquipped: computed(() => document.value.system.isWeightlessWhenEquipped),
    isMasterwork: computed(() => document.value.system.isMasterwork ?? false),
  };

  const documentActions = {
    ...physicalStore.documentActions,
    toggleMasterwork: async (value: boolean) => {
      await syncMasterworkAeState(document.value as unknown as EquippableItemLike, value);
    },
  };

  const store: EquippableDocumentStore<TDocument> = {
    ...physicalStore,
    documentGetters,
    documentActions,
  };

  return store;
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

interface EquippableItemStore extends PhysicalItemStore {
  documentGetters: EquippableItemGetters;
  _storeUtils: EquippableItemStoreUtils;
  documentActions: EquippableItemActions;
}

type EquippableDocumentStore<TDocument extends EquippableItemLike = EquippableItemLike> =
  PhysicalDocumentStore<TDocument> & {
    _storeUtils: EquippableItemStoreUtils & ItemSheetStoreUtils<TDocument>;
    documentGetters: EquippableItemGetters & ItemDocumentGetters;
    documentActions: EquippableItemActions & ItemDocumentActions<TDocument>;
  };

export type {
  EquippableDocumentStore,
  EquippableItemActions,
  EquippableItemGetters,
  EquippableItemStore,
  EquippableItemStoreUtils,
  UseEquippableItemStoreOptions,
};

export {
  useEquippableItemStore,
};
