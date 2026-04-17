import type { DocumentSheetStore, DocumentSheetStoreUtils } from '@ec/CoreMixin/index.mjs';
import type { IdentifiableDocumentActions, IdentifiableDocumentGetters, IdentifiableDocumentStoreUtils, IdentifiableStore } from '@ec/Identifiable/index.mjs';
import { useIdentifiableStore } from '@ec/Identifiable/index.mjs';
import type { ActiveEffectConfigStore, ActiveEffectConfigStoreDocumentActions, ActiveEffectConfigStoreDocumentGetters } from '@effects/BaseActiveEffect/index.mjs';
import {
  getDefaultActiveEffectTabs,
  useActiveEffectConfigStore,
} from '@effects/BaseActiveEffect/index.mjs';
import type { MaterialType } from '@effects/material/index.mjs';
import { Material, materialChangesTab, materialDetailsTab } from '@effects/material/index.mjs';
import { PriceData } from '@settings/currency/index.mjs';
import type { DamageReductionTypesConfig } from '@settings/gameRules/_types.mjs';
import { GAME_RULES_KEYS } from '@settings/gameRules/constants.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import type { MultiSelectOption } from '@vc/Fields/FormGroups/types.mjs';
import type { VueApplicationContext } from '@vueApps/VueAppTypes.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

const useMaterialStore = (context: VueApplicationContext<Material>): MaterialStore => {
  const baseStore = useActiveEffectConfigStore<MaterialType>(context);
  const identifiableStore = useIdentifiableStore(
    context,
    baseStore as DocumentSheetStore<MaterialType>
  );
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
    ...identifiableStore.documentGetters,
    price: computed(() => getViewAwareFieldValue('system.price') || new PriceData({})),
    hardness: computed(() => getViewAwareFieldValue('system.hardness') ?? 0),
    bonusHp: computed(() => getViewAwareFieldValue('system.bonusHp') ?? 0),
    magicEquivalency: computed(() => getViewAwareFieldValue('system.magicEquivalency') ?? 0),
    damageReductionTypes: computed(() => [...(getViewAwareFieldValue<string[]>('system.damageReductionTypes') ?? [])]),
    damageReductionTypeOptions: computed<MultiSelectOption<string>[]>(() => {
      const config = game.settings.get(SYSTEM_ID, GAME_RULES_KEYS.DAMAGE_REDUCTION_TYPES) as DamageReductionTypesConfig;
      return Object.entries(config)
        .filter(([, entry]) => entry.enabled)
        .map(([key, entry]) => ({
          value: key,
          label: entry.label,
        }));
    }),
  };

  const _storeUtils: MaterialStoreUtils = {
    ...baseStore._storeUtils,
    ...identifiableStore._storeUtils,
  };

  return {
    ...baseStore,
    ...identifiableStore,
    documentGetters,
    _storeUtils,
    documentActions: {
      ...baseStore.documentActions,
      ...identifiableStore.documentActions,
    },
  };
};

interface MaterialGetters extends ActiveEffectConfigStoreDocumentGetters,
  IdentifiableDocumentGetters
{
  price: ComputedRef<PriceData>;
  hardness: ComputedRef<number>;
  bonusHp: ComputedRef<number>;
  magicEquivalency: ComputedRef<number | null>;
  damageReductionTypes: ComputedRef<string[]>;
  damageReductionTypeOptions: ComputedRef<MultiSelectOption<string>[]>;
}

interface MaterialStoreUtils extends DocumentSheetStoreUtils<MaterialType>, 
  IdentifiableDocumentStoreUtils {}

interface MaterialActions extends ActiveEffectConfigStoreDocumentActions<MaterialType>,
  IdentifiableDocumentActions {}

interface MaterialStore extends IdentifiableStore,
  ActiveEffectConfigStore<MaterialType>
{
  documentGetters: MaterialGetters;
  _storeUtils: MaterialStoreUtils;
  documentActions: MaterialActions;
}

export { useMaterialStore };
export type { MaterialStore };
