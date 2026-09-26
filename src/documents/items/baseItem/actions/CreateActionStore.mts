import { type MeleeAttackEditorStore,useMeleeAttackEditorStore } from '@items/physical/weapon/actions/MeleeWeaponAttack/MeleeAttackEditorStore.mjs';
import type { RangedAttackEditorStore } from '@items/physical/weapon/actions/RangedAttack/RangedAttackEditorStore.mjs';
import { useRangedAttackEditorStore } from '@items/physical/weapon/actions/RangedAttack/RangedAttackEditorStore.mjs';

import type { ActionDataModel } from './ActionDataModel.mjs';
import type { ActionEditorStoreParams } from './ActionEditorStore.mjs';
import { ACTION_TYPE, type ActionType } from './constants.mjs';

type StoreFactory<ActionEditorStore> =
  (params: ActionEditorStoreParams<any>) => ActionEditorStore;

type StoreTypeLookup = {
  [ACTION_TYPE.MELEE]: StoreFactory<MeleeAttackEditorStore>;
  [ACTION_TYPE.RANGED]: StoreFactory<RangedAttackEditorStore>;
  // [ACTION_TYPE.SPELL_CAST]: StoreFactory<ActionEditorStore>;
};

const StoreTypeLookup: StoreTypeLookup = {
  [ACTION_TYPE.MELEE]: useMeleeAttackEditorStore,
  [ACTION_TYPE.RANGED]: useRangedAttackEditorStore,
  // [ACTION_TYPE.SPELL_CAST]: useActionEditorStore<ActionDataModel>,
};

const createActionStore = <T extends ActionDataModel>(
  actionType: ActionType,
  params: ActionEditorStoreParams<T>
) => {
  const useStore = StoreTypeLookup[actionType];
  return useStore(params);
};

export type {
  StoreFactory,
  StoreTypeLookup,
};

export {
  createActionStore,
};
