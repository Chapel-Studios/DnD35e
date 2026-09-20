import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import type { WeaponAttackEditorStoreActions, WeaponAttackEditorStoreGetters, WeaponAttackEditorStoreParams } from '../WeaponAttack/WeaponAttackEditorStore.mjs';
import { useWeaponAttackEditorStore } from '../WeaponAttack/WeaponAttackEditorStore.mjs';
import type { RangedWeaponProperty } from './constants.mjs';
import type { RangedWeaponAttack } from './RangedAttackDataModel.mjs';

interface RangedAttackEditorStoreParams extends WeaponAttackEditorStoreParams<RangedWeaponAttack> {}

const useRangedAttackEditorStore = (params: RangedAttackEditorStoreParams) => {
  const baseStore = useWeaponAttackEditorStore<RangedWeaponAttack>(params);
  
  const getters = {
    ...baseStore.getters,
    properties: computed(() => params.action.value.properties),
    rangeIncrement: computed(() => params.action.value.rangeIncrement),
    isAmmoRequired: computed(() => params.action.value.isAmmoRequired),
  };
  
  return {
    ...baseStore,
    getters,
  };
};

interface RangedAttackEditorStoreGetters extends
  Omit<WeaponAttackEditorStoreGetters, 'properties'> {
    properties: ComputedRef<Set<RangedWeaponProperty>>;
    rangeIncrement: ComputedRef<number>;
    isAmmoRequired: ComputedRef<boolean>;
  }

interface RangedAttackEditorStoreActions extends WeaponAttackEditorStoreActions {}

interface RangedAttackEditorStore {
  getters: RangedAttackEditorStoreGetters;
  actions: RangedAttackEditorStoreActions;
}

export type {
  RangedAttackEditorStore,
  RangedAttackEditorStoreActions,
  RangedAttackEditorStoreGetters,
  RangedAttackEditorStoreParams,
};

export {
  useRangedAttackEditorStore,
};
