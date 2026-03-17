import { IntellisenseSchema } from '@helpers/formulae/index.mjs';
import type { ItemSheetStore } from '@items/baseItem/index.mjs';
import { useItemSheetStore } from '@items/baseItem/index.mjs';
import type { EquippableItemLike, EquippableItemStore } from '@items/components/Equippable/index.mjs';
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

  const weaponGetters = {
    weaponType: computed(() => game.i18n.localize(document.value.system.weaponType)),
    weaponSubtype: computed(() => game.i18n.localize(document.value.system.weaponSubtype)),
  };

  return {
    ...baseStore,
    ...equippableStore,
    weaponGetters,
  };
};

interface WeaponStore extends EquippableItemStore, ItemSheetStore<Weapon> {
  weaponGetters: {
    weaponType: ComputedRef<WeaponType>;
    weaponSubtype: ComputedRef<WeaponSubtype>;
  };
}

export { useWeaponStore };
export type { WeaponStore };
