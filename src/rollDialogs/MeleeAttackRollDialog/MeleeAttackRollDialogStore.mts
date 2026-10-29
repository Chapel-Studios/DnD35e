import { computed } from 'vue';

import type { WeaponAttackModifierToggle } from '../WeaponAttackRollDialog/types.mjs';
import { useWeaponAttackRollDialogStore } from '../WeaponAttackRollDialog/WeaponAttackRollDialogStore.mjs';
import type { MeleeAttackRollDialogContext } from './types.mjs';

function useMeleeAttackRollDialogStore(context: MeleeAttackRollDialogContext) {
  const base = useWeaponAttackRollDialogStore(context);
  return {
    ...base,
    app: {
      ...base.app,
      attackTypeModifiers: computed(() => base.toggles.filter(mod => mod.group === 'attackType')),
      combatStatusModifiers: computed(() => base.toggles.filter(mod => mod.group === 'combatStatus')),
    },
    actions: {
      ...base.actions,
      updateMeleeAttackToggle: (mod: WeaponAttackModifierToggle, checked: boolean) => { mod.checked = checked; },
    },
  };
}

type MeleeAttackRollDialogStore = ReturnType<typeof useMeleeAttackRollDialogStore>;
export type { MeleeAttackRollDialogStore };
export { useMeleeAttackRollDialogStore };
