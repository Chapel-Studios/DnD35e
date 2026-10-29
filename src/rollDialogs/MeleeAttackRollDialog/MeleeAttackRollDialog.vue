<template>
  <WeaponAttackRollDialog>
    <div v-if="hasModifiers" class="combat-modifiers subgrid">
      <ModifierToggleList
        :updateHandler="updateMeleeAttackToggle"
        :modifiers="attackTypeModifiers"
        label="dnd35e.COMBAT.CombatModifiers.AttackType"
      />
      <ModifierToggleList
        :updateHandler="updateMeleeAttackToggle"
        :modifiers="combatStatusModifiers"
        label="dnd35e.COMBAT.CombatModifiers.CombatStatus"
      />
    </div>

  </WeaponAttackRollDialog>
</template>

<script setup lang="ts">
  import { provide } from 'vue';

  import ModifierToggleList from '../RollDialog/ModifierToggleList.vue';
  import { RollDialogStoreSymbol } from '../RollDialog/RollDialogStore.mjs';
  import type { RollDialogContext } from '../RollDialog/types.mjs';
  import type { WeaponAttackRollDialogData, WeaponAttackRollDialogResult } from '../WeaponAttackRollDialog/types.mjs';
  import WeaponAttackRollDialog from '../WeaponAttackRollDialog/WeaponAttackRollDialog.vue';
  import { useMeleeAttackRollDialogStore } from './MeleeAttackRollDialogStore.mjs';

  const props = defineProps<{
    context: RollDialogContext<WeaponAttackRollDialogData, WeaponAttackRollDialogResult>;
  }>();

  const store = useMeleeAttackRollDialogStore(props.context);

  provide(RollDialogStoreSymbol, store);

  const {
    app: {
      attackTypeModifiers,
      combatStatusModifiers,
    },
    actions: {
      updateMeleeAttackToggle,
    },
  } = store;

  const hasModifiers = combatStatusModifiers.value.length
    || attackTypeModifiers.value.length;
</script>
