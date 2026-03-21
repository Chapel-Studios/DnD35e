import { IntellisenseSchema } from '@helpers/formulae/index.mjs';
import type { ItemDocumentGetters, ItemSheetStore, ItemSheetStoreUtils } from '@items/baseItem/index.mjs';
import { useItemSheetStore } from '@items/baseItem/index.mjs';
import type { EquippableItemGetters, EquippableItemLike, EquippableItemStore, EquippableItemStoreUtils } from '@items/components/Equippable/index.mjs';
import { useEquippableItemStore } from '@items/components/Equippable/index.mjs';
import { physicalItemEffectsTab } from '@items/components/Physical/index.mjs';
import type { Weapon, WeaponSubtype, WeaponType } from '@items/weapon/index.mjs';
import { weaponDetailsTab } from '@items/weapon/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

const useWeaponStore = (context: VueApplicationContext<Weapon>) => {
  const baseStore = useItemSheetStore(context);
  baseStore.intellisense.nameFormulaIntellisenseSchema = computed(() => {
    const result: IntellisenseSchema = {
      self: baseStore.intellisense.getSelf().value,
    };
    result.owner = baseStore.intellisense.getParent([], { documentType: 'Actor', subtype: 'character' }).value;
    return result;
  });

  const equippableStore = useEquippableItemStore(
    context as VueApplicationContext<EquippableItemLike>,
    baseStore as ItemSheetStore
  );

  baseStore.tabs.tabActions.replaceTabs([
    weaponDetailsTab,
    physicalItemEffectsTab,
  ]);
  const document = baseStore._storeUtils.document;

  const documentGetters: WeaponGetters = {
    ...baseStore.documentGetters,
    ...equippableStore.documentGetters,
    weaponType: computed(() => game.i18n.localize(document.value.system.weaponType)),
    weaponSubtype: computed(() => game.i18n.localize(document.value.system.weaponSubtype)),
  };

  return {
    ...baseStore,
    ...equippableStore,
    documentGetters,
  };
};

interface WeaponGetters extends EquippableItemGetters, ItemDocumentGetters {
  weaponType: ComputedRef<string>;
  weaponSubtype: ComputedRef<string>;
}

interface weaponStoreUtils extends EquippableItemStoreUtils, ItemSheetStoreUtils<Weapon> {}

interface WeaponStore extends EquippableItemStore, ItemSheetStore<Weapon> {
  documentGetters: WeaponGetters;
  _storeUtils: weaponStoreUtils;
}

export { useWeaponStore };
export type { WeaponStore };
