import { DocumentSheetStore } from '@ec/CoreMixin/index.mjs';
import type { IdentifiableStore } from '@ec/Identifiable/index.mjs';
import { useIdentifiableStore } from '@ec/Identifiable/index.mjs';
import type { ActiveEffectConfigStore } from '@effects/BaseActiveEffect/index.mjs';
import {
  getDefaultActiveEffectTabs,
  useActiveEffectConfigStore,
} from '@effects/BaseActiveEffect/index.mjs';
import { materialDetailsTab, MaterialType } from '@effects/material/index.mjs';
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

  const document = baseStore._storeUtils.document;

  const materialGetters = {
    bonusHardness: computed(() => document.value.system.bonusHardness ?? 0),
    bonusHpPerInch: computed(() => document.value.system.bonusHpPerInch ?? 0),
    magicEquivalent: computed(() => document.value.system.magicEquivalent ?? 0),
    isAlchemicalSilverEquivalent: computed(() => document.value.system.isAlchemicalSilverEquivalent),
    isAdamantineEquivalent: computed(() => document.value.system.isAdamantineEquivalent),
    isColdIronEquivalent: computed(() => document.value.system.isColdIronEquivalent),
  };

  return {
    ...baseStore,
    ...identifiableStore,
    materialGetters,
  };
};

interface MaterialStore extends IdentifiableStore,
  ActiveEffectConfigStore<MaterialType>
{
  materialGetters: {
    bonusHardness: ComputedRef<number>;
    bonusHpPerInch: ComputedRef<number>;
    magicEquivalent: ComputedRef<number | null>;
    isAlchemicalSilverEquivalent: ComputedRef<boolean>;
    isAdamantineEquivalent: ComputedRef<boolean>;
    isColdIronEquivalent: ComputedRef<boolean>;
  };
}

export { useMaterialStore };
export type { MaterialStore };
