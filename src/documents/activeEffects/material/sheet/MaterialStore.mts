import type { DocumentSheetStoreUtils } from '@documents/document/index.mjs';
import type { ActiveEffectConfigStoreDocumentActions, ActiveEffectConfigStoreDocumentGetters, UseActiveEffectConfigStoreOptions } from '@effects/baseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
import type { ActiveEffectConfigStore } from '@effects/baseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
import { useActiveEffectConfigStore } from '@effects/baseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
import { getDefaultActiveEffectTabs } from '@effects/baseActiveEffect/sheet/tabs/index.mjs';
import type { MaterialSubtype } from '@effects/material/data/index.mjs';
import type { MaterialType } from '@effects/material/Material.mjs';
import { Material } from '@effects/material/Material.mjs';
import { CurrencyData } from '@fields/currency/CurrencyData.mjs';
import { GAME_RULES_KEYS } from '@settings/gameRules/constants.mjs';
import type { DamageReductionTypesConfig } from '@settings/gameRules/types.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import type { SelectOption } from '@vc/fields/formGroups/types.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import { materialChangesTab, materialDetailsTab } from './tabs/index.mjs';

const useMaterialStore = (
  context: VueApplicationContext<Material>,
  options: UseActiveEffectConfigStoreOptions = {}
): MaterialStore => {
  const baseStore = useActiveEffectConfigStore<MaterialType>(context, options);
  const { replaceTabs } = baseStore._storeUtils.tabStore;
  replaceTabs([
    materialDetailsTab,
    ...getDefaultActiveEffectTabs()
      .filter(tab => tab.id !== 'details' && tab.id !== 'changes'),
    materialChangesTab,
  ]);

  const {
    documentGetters: { getViewAwareFieldValue },
  } = baseStore;

  const documentGetters: MaterialGetters = {
    ...baseStore.documentGetters,
    price: computed(() => getViewAwareFieldValue('system.price') || new CurrencyData({})),
    hardness: computed(() => getViewAwareFieldValue('system.hardness') ?? 0),
    bonusHp: computed(() => getViewAwareFieldValue('system.bonusHp') ?? 0),
    materialSubtype: computed(() => getViewAwareFieldValue<MaterialSubtype>('system.materialSubtype') ?? 'standard'),
    magicEquivalency: computed(() => getViewAwareFieldValue('system.magicEquivalency') ?? 0),
    damageReductionTypes: computed(() => [...(getViewAwareFieldValue<string[]>('system.damageReductionTypes') ?? [])]),
    damageReductionTypeOptions: computed<SelectOption<string>[]>(() => {
      const config = game.settings.get(SYSTEM_ID, GAME_RULES_KEYS.DAMAGE_REDUCTION_TYPES) as DamageReductionTypesConfig;
      const systemDefaults = (CONFIG.dnd35e.gameRules.damageReductionTypes ?? {}) as Record<string, { label: string }>;
      return Object.entries(config)
        .filter(([, entry]) => entry.enabled)
        .map(([key, entry]) => ({
          value: key,
          // Use pre-localized CONFIG label for system entries; stored label for custom
          label: systemDefaults[key]?.label ?? entry.label,
        }));
    }),
  };

  const _storeUtils: MaterialStoreUtils = {
    ...baseStore._storeUtils,
  };

  return {
    ...baseStore,
    documentGetters,
    _storeUtils,
    documentActions: {
      ...baseStore.documentActions,
    },
  };
};

interface MaterialGetters extends ActiveEffectConfigStoreDocumentGetters
{
  price: ComputedRef<CurrencyData>;
  hardness: ComputedRef<number>;
  bonusHp: ComputedRef<number>;
  materialSubtype: ComputedRef<MaterialSubtype>;
  magicEquivalency: ComputedRef<number | null>;
  damageReductionTypes: ComputedRef<string[]>;
  damageReductionTypeOptions: ComputedRef<SelectOption<string>[]>;
}

interface MaterialStoreUtils extends DocumentSheetStoreUtils<MaterialType> {}

interface MaterialActions extends ActiveEffectConfigStoreDocumentActions<MaterialType> {}

interface MaterialStore extends ActiveEffectConfigStore<MaterialType>
{
  documentGetters: MaterialGetters;
  _storeUtils: MaterialStoreUtils;
  documentActions: MaterialActions;
}

export { useMaterialStore };
export type { MaterialStore };
