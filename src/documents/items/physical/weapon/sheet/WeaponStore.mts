import type { ItemDocumentActions, ItemDocumentGetters, ItemSheetStore, ItemSheetStoreUtils } from '@items/baseItem/index.mjs';
import { useItemSheetStore } from '@items/baseItem/index.mjs';
import type { EquippableItemGetters, EquippableItemLike, EquippableItemStore, EquippableItemStoreUtils } from '@items/physical/equippableItem/index.mjs';
import { useEquippableItemStore } from '@items/physical/equippableItem/index.mjs';
import type { EquippableItemActions } from '@items/physical/equippableItem/sheet/EquippableItemStore.mjs';
import { physicalItemEffectsTab } from '@items/physical/physicalItem/index.mjs';
import { WEAPON_SUBTYPE_LOCALIZED, WEAPON_TYPE_LOCALIZED } from '@items/physical/weapon/data/constants.mjs';
import type { Weapon } from '@items/physical/weapon/index.mjs';
import { weaponDetailsTab } from '@items/physical/weapon/index.mjs';
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
    weaponType: computed(() => game.i18n.localize(WEAPON_TYPE_LOCALIZED[document.value.system.weaponType])),
    weaponSubtype: computed(() => game.i18n.localize(WEAPON_SUBTYPE_LOCALIZED[document.value.system.weaponSubtype])),
  };

  const _storeUtils: weaponStoreUtils = {
    ...baseStore._storeUtils,
    ...equippableStore._storeUtils,
  };

  const documentActions = {
    ...baseStore.documentActions,
    ...equippableStore.documentActions,
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
