import type { UseDocumentStoreOptions } from '@documents/document/sheet/DocumentSheetStore.mjs';
import { type PhysicalDocumentStore, physicalItemEffectsTab, type PhysicalItemGetters,usePhysicalItemStore } from '@items/physical/physicalItem/sheet/index.mjs';
import type { VueApplicationContext } from '@vueApps/index.mjs';
import { computed, type ComputedRef } from 'vue';

import type { Ammo } from '../Ammo.mjs';
import { ammoDetailsTab } from './tabs/index.mjs';

const useAmmoStore = (
  context: VueApplicationContext<Ammo>,
  options: UseDocumentStoreOptions = {}
) => {
  const physicalStore = usePhysicalItemStore(context, {
    ...options,
    defaultTabs: [ammoDetailsTab, physicalItemEffectsTab],
    defaultActiveTab: 'details',
  });

  const document = physicalStore._storeUtils.document;
  const { getViewAwareFieldValue } = physicalStore.documentGetters;

  const documentGetters = {
    ...physicalStore.documentGetters,
    ammoType: computed(() => getViewAwareFieldValue<string>('system.ammoType') ?? ''),
    ammoTypeLabel: computed(() => {
      const ammoType = getViewAwareFieldValue<string>('system.ammoType') ?? '';
      const localizationKey = `dnd35e.AMMO.Type.${ammoType.toLocaleLowerCase()}`;
      return game.i18n.localizeWithFallback(localizationKey, ammoType);
    }),
    isAlwaysRecoverable: computed(() => document.value.system.isAlwaysRecoverable),
  };

  const store: AmmoStore = {
    ...physicalStore,
    documentGetters,
  };

  game.dnd35e.stores[document.value.documentName][context.document.uuid] = store;

  return store;
};

interface AmmoGetters extends PhysicalItemGetters {
  ammoType: ComputedRef<string>;
  ammoTypeLabel: ComputedRef<string>;
  isAlwaysRecoverable: ComputedRef<boolean>;
}

type AmmoStore = PhysicalDocumentStore<Ammo> & {
  documentGetters: AmmoGetters;
}

export type { AmmoStore };
export { useAmmoStore };
