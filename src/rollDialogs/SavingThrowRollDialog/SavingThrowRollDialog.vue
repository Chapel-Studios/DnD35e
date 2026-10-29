<template>
  <RollDialog>
    <RollBreakdown
      v-bind="store.savingThrow"
      :schema="store.app.familiarSchema.value"
    />
  </RollDialog>
</template>

<script setup lang="ts">
  import { provide } from 'vue';

  import RollBreakdown from '../RollDialog/RollBreakdown.vue';
  import RollDialog from '../RollDialog/RollDialog.vue';
  import { RollDialogStoreSymbol } from '../RollDialog/RollDialogStore.mjs';
  import { useSavingThrowRollDialogStore } from './SavingThrowRollDialogStore.mjs';
  import type { SavingThrowRollDialogContext } from './types.mjs';

  const props = defineProps<{
    context: SavingThrowRollDialogContext;
  }>();

  const store = useSavingThrowRollDialogStore(props.context);
  provide(RollDialogStoreSymbol, store);
</script>
