import type { ActiveEffectConfigStore, UseActiveEffectConfigStoreOptions } from '@effects/baseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
import { useActiveEffectConfigStore } from '@effects/baseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
import type { Secret, SecretType } from '@effects/secret/Secret.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';

import { secretMasksTab } from './tabs/index.mjs';

const useSecretStore = (
  context: VueApplicationContext<Secret>,
  options: UseActiveEffectConfigStoreOptions = {}
): SecretStore => {
  const baseStore = useActiveEffectConfigStore<SecretType>(context, options);
  const { replaceTabs } = baseStore._storeUtils.tabStore;

  // Single tab: masks (description + mask field list)
  replaceTabs([secretMasksTab]);

  return {
    ...baseStore,
  };
};

type SecretStore = ActiveEffectConfigStore<SecretType>;

export { useSecretStore };
export type { SecretStore };
