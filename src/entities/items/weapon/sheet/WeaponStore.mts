import { usePhysicalItemStore } from '@items/components/Physical/index.mjs';
import type { Weapon, WeaponSheetRenderContext } from '@items/weapon/index.mjs';
import { useItemSheetStore } from '@items/baseItem/index.mjs';
import { useItemWithMaterialsStore } from '@items/components/HasMaterial/index.mjs';
import { computed, type Ref } from 'vue';

const useWeaponStore = (context: WeaponSheetRenderContext) => {
  const baseStore = useItemSheetStore(context);
  const physicalStore = usePhysicalItemStore(context, baseStore);
  const hasMaterialStore = useItemWithMaterialsStore(context, baseStore);

  baseStore.setItemType('TYPES.Item.weapon');
  const document = baseStore._document as unknown as Ref<Weapon>;

  const weaponGetters = {
    weaponType: computed(() => game.i18n.localize(document.value.system.weaponType)),
    weaponSubtype: computed(() => game.i18n.localize(document.value.system.weaponSubtype)),
  };

  return {
    ...baseStore,
    ...physicalStore,
    ...hasMaterialStore,
    weaponGetters,
  };
};

export { useWeaponStore };
export type WeaponStore = ReturnType<typeof useWeaponStore>;
