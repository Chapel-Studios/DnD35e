import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import type { WeaponAttackEditorStoreActions, WeaponAttackEditorStoreGetters, WeaponAttackEditorStoreParams } from '../WeaponAttack/WeaponAttackEditorStore.mjs';
import { useWeaponAttackEditorStore } from '../WeaponAttack/WeaponAttackEditorStore.mjs';
import type { MeleeWeaponProperty } from './constants.mjs';
import type { MeleeWeaponAttack } from './MeleeAttackDataModel.mjs';

interface MeleeAttackEditorStoreParams extends WeaponAttackEditorStoreParams<MeleeWeaponAttack> {}

const useMeleeAttackEditorStore = (params: MeleeAttackEditorStoreParams) => {
  const baseStore = useWeaponAttackEditorStore<MeleeWeaponAttack>(params);
  
  const getters = {
    ...baseStore.getters,
    properties: computed(() => params.action.value.properties),
    reachLength: computed(() => params.action.value.reachLength),
  };
  
  return {
    ...baseStore,
    getters,
  };
};

interface MeleeAttackEditorStoreGetters extends
  Omit<WeaponAttackEditorStoreGetters, 'properties'> {
    properties: ComputedRef<Set<MeleeWeaponProperty>>;
    reachLength: ComputedRef<number>;
  }

interface MeleeAttackEditorStoreActions extends WeaponAttackEditorStoreActions {}

interface MeleeAttackEditorStore {
  getters: MeleeAttackEditorStoreGetters;
  actions: MeleeAttackEditorStoreActions;
}

export type {
  MeleeAttackEditorStore,
  MeleeAttackEditorStoreActions,
  MeleeAttackEditorStoreGetters,
  MeleeAttackEditorStoreParams,
};

export {
  useMeleeAttackEditorStore,
};
