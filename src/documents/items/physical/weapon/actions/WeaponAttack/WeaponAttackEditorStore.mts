import type { DamageType } from '@constants/attacks/damageTypes.mjs';
import type { FormulaDataSource } from '@helpers/formulae/FormulaData.mjs';
import type {
  ActionEditorStoreActions,
  ActionEditorStoreGetters,
  ActionEditorStoreParams,
} from '@items/baseItem/actions/ActionEditorStore.mjs';
import { useActionEditorStore } from '@items/baseItem/actions/ActionEditorStore.mjs';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import type { AllWeaponProperties } from './constants.mjs';
import type { WeaponAttackDataModel } from './WeaponAttackDataModel.mjs';

interface WeaponAttackEditorStoreParams<T extends WeaponAttackDataModel> 
  extends ActionEditorStoreParams<T> {}

const useWeaponAttackEditorStore = <T extends WeaponAttackDataModel>(
  params: WeaponAttackEditorStoreParams<T>
) => {
  const baseStore = useActionEditorStore<T>(params);

  const getters = {
    ...baseStore.getters,
    attackFormulaData: computed(() => params.action.value.attackFormula),
    damageFormulaData: computed(() => params.action.value.damageFormula),
    // True authored formula text (pre-AE) — see `nameFormulaSourceText` for why.
    attackFormulaSourceText: computed(() => (params.sourceAction.value as { attackFormula?: FormulaDataSource } | undefined)?.attackFormula?.formula),
    damageFormulaSourceText: computed(() => (params.sourceAction.value as { damageFormula?: FormulaDataSource } | undefined)?.damageFormula?.formula),
    damageType: computed(() => params.action.value.damageType),
    critRange: computed(() => params.action.value.critRange),
    critMultiplier: computed(() => params.action.value.critMultiplier),
    requiresEquipped: computed(() => params.action.value.requiresEquipped),
    properties: computed(() => params.action.value.properties ?? []),
  };
  
  return {
    ...baseStore,
    getters,
  };
};

interface WeaponAttackEditorStoreGetters extends ActionEditorStoreGetters {
  attackFormulaData: ComputedRef<FormulaDataSource>;
  damageFormulaData: ComputedRef<FormulaDataSource>;
  attackFormulaSourceText: ComputedRef<string | undefined>;
  damageFormulaSourceText: ComputedRef<string | undefined>;
  damageType: ComputedRef<DamageType>;
  critRange: ComputedRef<number>;
  critMultiplier: ComputedRef<number>;
  requiresEquipped: ComputedRef<boolean>;
  properties: ComputedRef<Set<AllWeaponProperties>>;
} 

interface WeaponAttackEditorStoreActions extends ActionEditorStoreActions {
}

interface WeaponAttackEditorStore {
  getters: WeaponAttackEditorStoreGetters;
  actions: WeaponAttackEditorStoreActions;
}

export type {
  WeaponAttackEditorStore,
  WeaponAttackEditorStoreActions,
  WeaponAttackEditorStoreGetters,
  WeaponAttackEditorStoreParams,
};

export {
  useWeaponAttackEditorStore,
};