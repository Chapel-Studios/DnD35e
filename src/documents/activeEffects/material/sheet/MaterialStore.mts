import type { DocumentSheetStoreUtils } from '@documents/document/index.mjs';
import type { ActiveEffectConfigStoreDocumentActions, ActiveEffectConfigStoreDocumentGetters } from '@effects/BaseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
import type { ActiveEffectConfigStore } from '@effects/BaseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
import { useActiveEffectConfigStore } from '@effects/BaseActiveEffect/sheet/ActiveEffectConfigStore.mjs';
import { getDefaultActiveEffectTabs } from '@effects/BaseActiveEffect/sheet/tabs/index.mjs';
import type { MaterialType } from '@effects/material/Material.mjs';
import { Material } from '@effects/material/Material.mjs';
import { PriceData } from '@fields/PriceData.mjs';
import { GAME_RULES_KEYS } from '@settings/gameRules/constants.mjs';
import type { DamageReductionTypesConfig } from '@settings/gameRules/types.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import type { MultiSelectOption } from '@vc/Fields/FormGroups/types.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import { materialChangesTab, materialDetailsTab } from './tabs/index.mjs';

const useMaterialStore = (context: VueApplicationContext<Material>): MaterialStore => {
  const baseStore = useActiveEffectConfigStore<MaterialType>(context);
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
    price: computed(() => getViewAwareFieldValue('system.price') || new PriceData({})),
    hardness: computed(() => getViewAwareFieldValue('system.hardness') ?? 0),
    bonusHp: computed(() => getViewAwareFieldValue('system.bonusHp') ?? 0),
    magicEquivalency: computed(() => getViewAwareFieldValue('system.magicEquivalency') ?? 0),
    damageReductionTypes: computed(() => [...(getViewAwareFieldValue<string[]>('system.damageReductionTypes') ?? [])]),
    damageReductionTypeOptions: computed<MultiSelectOption<string>[]>(() => {
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
  price: ComputedRef<PriceData>;
  hardness: ComputedRef<number>;
  bonusHp: ComputedRef<number>;
  magicEquivalency: ComputedRef<number | null>;
  damageReductionTypes: ComputedRef<string[]>;
  damageReductionTypeOptions: ComputedRef<MultiSelectOption<string>[]>;
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
