<template>
  <RollDialog>
    <div class="base-row subgrid">
      <span class="label">{{ baseLabel }}</span>
      <span class="value">{{ formatBonus(baseTotal) }}</span>
    </div>
    <RollDialogFormulaField
      id="situational-modifier"
      class="grid-full-row"
      v-model="situationalModifier"
      label="dnd35e.ROLL.SituationalModifier"
    />
  </RollDialog>
</template>

<script setup lang="ts">
  import { provide } from 'vue';

  import RollDialog from '../RollDialog/RollDialog.vue';
  import RollDialogFormulaField from '../RollDialog/RollDialogFormulaField.vue';
  import { formatBonus, RollDialogStoreSymbol } from '../RollDialog/RollDialogStore.mjs';
  import { useInitiativeRollDialogStore } from './InitiativeRollDialogStore.mjs';
  import type { InitiativeRollDialogContext } from './types.mjs';

  const props = defineProps<{
    context: InitiativeRollDialogContext;
  }>();

  const store = useInitiativeRollDialogStore(props.context);
  const { situationalModifier } = store.initiative;
  const {
    baseLabel,
    baseTotal,
  } = store.app;

  provide(RollDialogStoreSymbol, store);
</script>
