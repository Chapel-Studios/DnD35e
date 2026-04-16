import type { ItemDocumentActions, ItemDocumentGetters, ItemSheetStore, ItemSheetStoreUtils } from '@items/baseItem/index.mjs';
import { useItemSheetStore } from '@items/baseItem/index.mjs';
import type { EquippableItemGetters, EquippableItemLike, EquippableItemStore, EquippableItemStoreUtils } from '@items/components/Equippable/index.mjs';
import { useEquippableItemStore } from '@items/components/Equippable/index.mjs';
import type { EquippableItemActions } from '@items/components/Equippable/sheet/EquippableItemStore.mjs';
import { physicalItemEffectsTab } from '@items/components/Physical/index.mjs';
import type { Weapon } from '@items/weapon/index.mjs';
import { weaponDetailsTab } from '@items/weapon/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

const useWeaponStore = (context: VueApplicationContext<Weapon>) => {
  const baseStore = useItemSheetStore(context);

  const equippableStore = useEquippableItemStore(
    context as VueApplicationContext<EquippableItemLike>,
    baseStore as ItemSheetStore
  );

  const { replaceTabs } = baseStore._storeUtils.tabStore;
  replaceTabs([
    weaponDetailsTab,
    physicalItemEffectsTab,
  ]);
  const document = baseStore._storeUtils.document;

  const documentGetters: WeaponGetters = {
    ...baseStore.documentGetters,
    ...equippableStore.documentGetters,
    weaponType: computed(() => game.i18n.localize(document.value.system.weaponType.value)),
    weaponSubtype: computed(() => game.i18n.localize(document.value.system.weaponSubtype.value)),
  };

  const _storeUtils: weaponStoreUtils = {
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

interface WeaponGetters extends EquippableItemGetters, ItemDocumentGetters {
  weaponType: ComputedRef<string>;
  weaponSubtype: ComputedRef<string>;
}

interface weaponStoreUtils extends EquippableItemStoreUtils, ItemSheetStoreUtils<Weapon> {}

interface WeaponActions extends EquippableItemActions, ItemDocumentActions<Weapon> {}

interface WeaponStore extends EquippableItemStore, ItemSheetStore<Weapon> {
  documentGetters: WeaponGetters;
  _storeUtils: weaponStoreUtils;
  documentActions: WeaponActions;
}

export { useWeaponStore };
export type { WeaponStore };
