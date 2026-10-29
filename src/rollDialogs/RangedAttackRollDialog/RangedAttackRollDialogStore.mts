import type { ComputedRef, WritableComputedRef } from 'vue';
import { computed } from 'vue';

import type { RollDialogContext } from '../RollDialog/types.mjs';
import type { WeaponAttackRollDialogStore } from '../WeaponAttackRollDialog/WeaponAttackRollDialogStore.mjs';
import { useWeaponAttackRollDialogStore } from '../WeaponAttackRollDialog/WeaponAttackRollDialogStore.mjs';
import type { AmmoOption, RangedAttackRollDialogData, RangedAttackRollDialogResult } from './types.mjs';

/**
 * Store for the ranged weapon attack roll dialog (poc.10 Story D refactor) — everything
 * `WeaponAttackRollDialogStore` provides, plus an optional ammo select. `ammoOptions` is
 * reserved for Story F (not yet implemented) — until then callers omit it and the field
 * stays hidden (see `RangedAttackRollDialog.vue`).
 */
function useRangedAttackRollDialogStore(
  context: RollDialogContext<RangedAttackRollDialogData, RangedAttackRollDialogResult>
): RangedAttackRollDialogStore {
  const weapon = useWeaponAttackRollDialogStore(context);

  const ammoOptions = computed(() => context.data.ammoOptions ?? []);
  const ammo = computed({
    get: () => context.data.ammo ?? null,
    set: (value: string | null) => { context.data.ammo = value; },
  });

  const rollAction = (): void => {
    context.resolve({
      ...weapon.getResult(),
      ammo: context.data.ammo ?? null,
    });
  };

  return {
    ...weapon,
    ranged: { ammoOptions, ammo },
    actions: { ...weapon.actions, roll: rollAction },
  };
}

interface RangedAttackRollDialogRangedStore {
  ammoOptions: ComputedRef<AmmoOption[]>;
  ammo: WritableComputedRef<string | null>;
}
interface RangedAttackRollDialogStore extends WeaponAttackRollDialogStore {
  ranged: RangedAttackRollDialogRangedStore;
}

export type { RangedAttackRollDialogRangedStore, RangedAttackRollDialogStore };
export { useRangedAttackRollDialogStore };
