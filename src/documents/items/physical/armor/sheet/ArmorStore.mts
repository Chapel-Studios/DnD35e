import type { ItemDocumentActions, ItemDocumentGetters, ItemSheetStore, ItemSheetStoreUtils } from '@items/baseItem/index.mjs';
import { useItemSheetStore } from '@items/baseItem/index.mjs';
import type { Armor } from '@items/physical/armor/index.mjs';
import { armorDetailsTab } from '@items/physical/armor/index.mjs';
import type { EquippableItemGetters, EquippableItemLike, EquippableItemStore, EquippableItemStoreUtils } from '@items/physical/equippableItem/index.mjs';
import { useEquippableItemStore } from '@items/physical/equippableItem/index.mjs';
import type { EquippableItemActions } from '@items/physical/equippableItem/sheet/EquippableItemStore.mjs';
import { physicalItemEffectsTab } from '@items/physical/physicalItem/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

const useArmorStore = (context: VueApplicationContext<Armor>) => {
  const baseStore = useItemSheetStore(context);

  const equippableStore = useEquippableItemStore(
    context as VueApplicationContext<EquippableItemLike>,
    baseStore as ItemSheetStore
  );

  const { replaceTabs } = baseStore._storeUtils.tabStore;
  replaceTabs([
    armorDetailsTab,
    physicalItemEffectsTab,
  ]);
  const document = baseStore._storeUtils.document;

  const documentGetters: ArmorGetters = {
    ...baseStore.documentGetters,
    ...equippableStore.documentGetters,
    armorType: computed(() => game.i18n.localize(document.value.system.armorType)),
    armorSubtype: computed(() => game.i18n.localize(document.value.system.armorSubtype)),
  };

  const _storeUtils: armorStoreUtils = {
    ...baseStore._storeUtils,
    ...equippableStore._storeUtils,
  };

  const documentActions = {
    ...baseStore.documentActions,
    // no specific actions in equippable yet, but they will come
    //...equippableStore.documentActions,
  };

  return {
    ...baseStore,
    ...equippableStore,
    documentGetters,
    documentActions,
    _storeUtils,
  };
};

interface ArmorGetters extends EquippableItemGetters, ItemDocumentGetters {
  armorType: ComputedRef<string>;
  armorSubtype: ComputedRef<string>;
}

interface armorStoreUtils extends EquippableItemStoreUtils, ItemSheetStoreUtils<Armor> {}

interface ArmorActions extends EquippableItemActions, ItemDocumentActions<Armor> {}

interface ArmorStore extends EquippableItemStore, ItemSheetStore<Armor> {
  documentGetters: ArmorGetters;
  _storeUtils: armorStoreUtils;
  documentActions: ArmorActions;
}

export { useArmorStore };
export type { ArmorStore };
