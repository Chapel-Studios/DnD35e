import type { EquippableDocumentStore } from '@items/physical/equippableItem/index.mjs';
import { useEquippableItemStore } from '@items/physical/equippableItem/index.mjs';
import { physicalItemEffectsTab } from '@items/physical/physicalItem/sheet/tabs/index.mjs';
import { WEAPON_SUBTYPE_LOCALIZED, WEAPON_TYPE_LOCALIZED } from '@items/physical/weapon/data/constants.mjs';
import type { Weapon } from '@items/physical/weapon/index.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import { weaponDetailsTab } from './tabs/index.mjs';

const useWeaponStore = (context: VueApplicationContext<Weapon>): WeaponStore => {
  const equippableStore = useEquippableItemStore<Weapon>(context, {
    defaultTabs: [weaponDetailsTab, physicalItemEffectsTab],
    defaultActiveTab: 'details',
  });
  const document = equippableStore._storeUtils.document;

  const documentGetters = {
    ...equippableStore.documentGetters,
    weaponType: computed(() => game.i18n.localize(WEAPON_TYPE_LOCALIZED[document.value.system.weaponType])),
    weaponSubtype: computed(() => game.i18n.localize(WEAPON_SUBTYPE_LOCALIZED[document.value.system.weaponSubtype])),
  };

  const store: WeaponStore = {
    ...equippableStore,
    documentGetters,
  };

  game.dnd35e.stores[document.value.documentName][context.document.uuid] = store;

  return store;
};

interface WeaponGetters {
  weaponType: ComputedRef<string>;
  weaponSubtype: ComputedRef<string>;
}

type WeaponStore = EquippableDocumentStore<Weapon> & {
  documentGetters: EquippableDocumentStore<Weapon>['documentGetters'] & WeaponGetters;
};

export { useWeaponStore };
export type { WeaponGetters, WeaponStore };
