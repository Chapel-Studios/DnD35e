<template>
  <RollDialog>
    <div class="base-row subgrid">
      <span class="label">{{ baseLabel }}</span>
      <span class="value">{{ formatBonus(baseTotal) }}</span>
    </div>
    <RollDialogFormulaField
      class="grid-full-row"
      id="situational-modifier"
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
  import { useSavingThrowRollDialogStore } from './SavingThrowRollDialogStore.mjs';
  import type { SavingThrowRollDialogContext } from './types.mjs';

  const props = defineProps<{
    context: SavingThrowRollDialogContext;
  }>();

  const store = useSavingThrowRollDialogStore(props.context);
  const { situationalModifier } = store.save;
  provide(RollDialogStoreSymbol, store);

  const {
    baseLabel,
    baseTotal,
  } = store.app;
</script>
