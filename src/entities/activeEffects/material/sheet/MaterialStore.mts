import { computed, Ref } from 'vue';
import { Material, MaterialDetails } from '../index.mjs';
import { useIdentifiableStore } from '@items/components/Identifiable/index.mjs';
import { ItemSheetTab, useItemSheetStore } from '@items/baseItem/index.mjs';
import { MaterialType } from '../Material.mjs';

const getMaterialTabs = (): ItemSheetTab[] => [
  {
    id: 'material-details',
    // TODO find this actual label, like D35E.Name
    label: 'Details',
    component: MaterialDetails,
    order: 30,
  },
];

const useMaterialStore = (context: any) => {
  const baseStore = useItemSheetStore<MaterialType>(context);
  baseStore.setItemType('TYPES.Item.material');
  const identifiableStore = useIdentifiableStore<MaterialType>(context, baseStore);
  baseStore.tabs.tabActions.appendTabs(getMaterialTabs());

  const document = baseStore._document as unknown as Ref<Material>;

  const materialGetters = {
    bonusHardness: computed(() => document.value.system.bonusHardness),
    bonusHpPerInch: computed(() => document.value.system.bonusHpPerInch),
    magicEquivalent: computed(() => document.value.system.magicEquivalent),
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

export { useMaterialStore };
export type MaterialStore = ReturnType<typeof useMaterialStore>;
