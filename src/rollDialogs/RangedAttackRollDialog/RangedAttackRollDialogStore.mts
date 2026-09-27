import type { VueDialogContext } from '@vueApps/VueDialogMixin.mjs';
import type { ComputedRef, WritableComputedRef } from 'vue';
import { computed } from 'vue';

import { resolveFormulaString } from '../RollDialog/RollDialogStore.mjs';
import type { WeaponAttackRollDialogStore } from '../WeaponAttackRollDialog/WeaponAttackRollDialogStore.mjs';
import { buildWeaponAttackFormulaContexts, useWeaponAttackRollDialogStore } from '../WeaponAttackRollDialog/WeaponAttackRollDialogStore.mjs';
import type { AmmoOption, RangedAttackRollDialogData, RangedAttackRollDialogResult } from './types.mjs';

/**
 * Store for the ranged weapon attack roll dialog (poc.10 Story D refactor) — everything
 * `WeaponAttackRollDialogStore` provides, plus an optional ammo select. `ammoOptions` is
 * reserved for Story F (not yet implemented) — until then callers omit it and the field
 * stays hidden (see `RangedAttackRollDialog.vue`).
 */
function useRangedAttackRollDialogStore(
  context: VueDialogContext<RangedAttackRollDialogData, RangedAttackRollDialogResult>
): RangedAttackRollDialogStore {
  const weapon = useWeaponAttackRollDialogStore(context);

  const ammoOptions = computed(() => context.data.ammoOptions ?? []);
  const ammo = computed({
    get: () => context.data.ammo ?? null,
    set: (value: string | null) => { context.data.ammo = value; },
  });

  const rollAction = (): void => {
    const documentDataMap = buildWeaponAttackFormulaContexts(context.data);
    const resolvedAttackSituational = resolveFormulaString(context.data.attackSituationalModifier, documentDataMap);
    const toggleSum = weapon.weapon.combatModifierSum.value;
    const attackSituationalModifier = toggleSum === 0
      ? resolvedAttackSituational
      : resolvedAttackSituational
        ? `${resolvedAttackSituational} ${toggleSum >= 0 ? '+' : '-'} ${Math.abs(toggleSum)}`
        : `${toggleSum}`;
    context.resolve({
      attackSituationalModifier,
      rollMode: context.data.rollMode,
      combatModifiers: context.data.combatModifierToggles,
      damageSituationalModifier: resolveFormulaString(context.data.damageSituationalModifier ?? '', documentDataMap),
      wieldMode: context.data.wieldModeFromEquippedSlots,
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
