import { DocumentSheetStore, DocumentSheetStoreUtils } from '@ec/CoreMixin/index.mjs';
import type { IdentifiableDocumentGetters, IdentifiableDocumentStoreUtils, IdentifiableStore } from '@ec/Identifiable/index.mjs';
import { useIdentifiableStore } from '@ec/Identifiable/index.mjs';
import type { ActiveEffectConfigStore, ActiveEffectConfigStoreDocumentGetters } from '@effects/BaseActiveEffect/index.mjs';
import {
  getDefaultActiveEffectTabs,
  useActiveEffectConfigStore,
} from '@effects/BaseActiveEffect/index.mjs';
import { materialDetailsTab, MaterialType } from '@effects/material/index.mjs';
import { IntellisenseSchema } from '@helpers/formulae/types.mjs';
import type { DamageReductionTypesConfig } from '@settings/gameRules/_types.mjs';
import { GAME_RULES_KEYS } from '@settings/gameRules/constants.mjs';
import { SYSTEM_ID } from '@settings/shared.mjs';
import type { MultiSelectOption } from '@vc/Fields/FormGroups/types.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

const useMaterialStore = (context: any) => {
  const baseStore = useActiveEffectConfigStore<MaterialType>(context);
  const identifiableStore = useIdentifiableStore(
    context,
    baseStore as DocumentSheetStore<MaterialType>
  );
  baseStore.tabs.tabActions.replaceTabs([
    materialDetailsTab,
    ...getDefaultActiveEffectTabs()
      .filter(tab => tab.id !== 'details'),
  ]);
  baseStore.intellisense.nameFormulaIntellisenseSchema = computed(() => {
    const result: IntellisenseSchema = {
      self: baseStore.intellisense.getSelf().value,
    };
    result.item = baseStore.intellisense.getParent(['parent'], { documentType: 'Item', subtype: 'weapon' }).value;
    return result;
  });

  const document = baseStore._storeUtils.document;

  const documentGetters: MaterialGetters = {
    ...baseStore.documentGetters,
    ...identifiableStore.documentGetters,
    hardness: computed(() => document.value.system.hardness ?? 0),
    bonusHp: computed(() => document.value.system.bonusHp ?? 0),
    magicEquivalency: computed(() => document.value.system.magicEquivalency ?? 0),
    damageReductionTypes: computed(() => [...(document.value.system.damageReductionTypes ?? [])]),
    damageReductionTypeOptions: computed<MultiSelectOption[]>(() => {
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
  };
};

interface MaterialGetters extends ActiveEffectConfigStoreDocumentGetters,
  IdentifiableDocumentGetters
{
  hardness: ComputedRef<number>;
  bonusHp: ComputedRef<number>;
  magicEquivalency: ComputedRef<number | null>;
  damageReductionTypes: ComputedRef<string[]>;
  damageReductionTypeOptions: ComputedRef<MultiSelectOption[]>;
}

interface MaterialStoreUtils extends DocumentSheetStoreUtils<MaterialType>, 
  IdentifiableDocumentStoreUtils {}

interface MaterialStore extends IdentifiableStore,
  ActiveEffectConfigStore<MaterialType>
{
  documentGetters: MaterialGetters;
  _storeUtils: MaterialStoreUtils;
}

export { useMaterialStore };
export type { MaterialStore };
