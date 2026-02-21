import { identifiableDescriptionTab } from '@entities/components/Identifiable/index.mjs';
import type { ItemSheetStore } from '@items/baseItem/index.mjs';
import { defaultEffectsTab, useItemSheetStore } from '@items/baseItem/index.mjs';
import type { EquippableItemLike, EquippableItemStore } from '@items/components/Equippable/index.mjs';
import { useEquippableItemStore } from '@items/components/Equippable/index.mjs';
import type { Weapon } from '@items/weapon/index.mjs';
import { weaponDetailsTab } from '@items/weapon/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';

const useWeaponStore = (context: VueApplicationContext<Weapon>) => {
  const baseStore = useItemSheetStore(context);
  const physicalStore = useEquippableItemStore(context as unknown as VueApplicationContext<EquippableItemLike>, baseStore as any);

  baseStore.tabs.tabActions.replaceTabs([
    identifiableDescriptionTab,
    weaponDetailsTab,
    defaultEffectsTab,
  ]);
  const document = baseStore._document as unknown as Ref<Weapon>;

  const weaponGetters = {
    weaponType: computed(() => game.i18n.localize(document.value.system.weaponType)),
    weaponSubtype: computed(() => game.i18n.localize(document.value.system.weaponSubtype)),
  };

  return {
    ...baseStore,
    ...physicalStore,
    weaponGetters,
  };
};

interface WeaponStore extends EquippableItemStore, ItemSheetStore<Weapon> {
  itemType: ComputedRef<string>;
  setItemType: (newItemType: string) => void;
  getItemTypeDisplay: (fallback?: string) => ComputedRef<string>;
  weaponGetters: {
    weaponType: ComputedRef<string>;
    weaponSubtype: ComputedRef<string>;
  };
}

export { useWeaponStore };
export type { WeaponStore };
