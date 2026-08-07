import type { ActiveEffectConfigStore, UseActiveEffectConfigStoreOptions } from '@effects/baseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
import { useActiveEffectConfigStore } from '@effects/baseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
import type { General } from '@effects/general/General.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';

/**
 * General AE has no fields or tabs beyond the base ActiveEffect schema
 * (Details/Duration/Changes) — this is a thin pass-through leaf store, kept
 * as its own file for structural parity with Material/Secret.
 */
const useGeneralStore = (
  context: VueApplicationContext<General>,
  options: UseActiveEffectConfigStoreOptions = {}
): GeneralStore => {
  const baseStore = useActiveEffectConfigStore<General>(context, options);

  return {
    ...baseStore,
  };
};

type GeneralStore = ActiveEffectConfigStore<General>;

export { useGeneralStore };
export type { GeneralStore };
