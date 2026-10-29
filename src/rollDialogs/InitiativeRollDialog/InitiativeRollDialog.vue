<template>
  <RollDialog>
    <RollBreakdown v-bind="store.initRoll" :schema="store.app.familiarSchema.value" />
  </RollDialog>
</template>

<script setup lang="ts">
  import { provide } from 'vue';

  import RollBreakdown from '../RollDialog/RollBreakdown.vue';
  import RollDialog from '../RollDialog/RollDialog.vue';
  import { RollDialogStoreSymbol } from '../RollDialog/RollDialogStore.mjs';
  import { useInitiativeRollDialogStore } from './InitiativeRollDialogStore.mjs';
  import type { InitiativeRollDialogContext } from './types.mjs';

  const props = defineProps<{
    context: InitiativeRollDialogContext;
  }>();

  const store = useInitiativeRollDialogStore(props.context);
  provide(RollDialogStoreSymbol, store);
</script>
